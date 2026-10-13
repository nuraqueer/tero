import {
  base64UrlToBytes,
  bytesToBase64Url,
  openDelivery,
  sealDelivery,
  type Identity,
  type PeerContact,
  type SealedObject,
} from '@tero/crypto';
import type { Api } from './api';
import { ChatAccessError, requireAcceptedContact } from './chat-access';
import { ChatTransportError } from './chat-api';
import { ChatJournal } from './chat-journal';
import { NativeSefirah } from './sefirah-native';
import { SefirahMessages, type ChatItem } from './sefirah-mls';

type NativeChat = Awaited<ReturnType<SefirahMessages['createAsync']>>;
export type ChatRoute = 'connecting' | 'sefirah' | 'cloudflare' | 'mixed' | 'waiting';
export type DeliveryView = {
  items: ChatItem[];
  ready: boolean;
  route: ChatRoute;
  problem: boolean;
};
/** One visible conversation. No background delivery or receipt claims from a storage upload. */
export class ChatDelivery {
  private readonly controller = new AbortController();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private chain: Promise<unknown> = Promise.resolve();
  private contact: PeerContact | null = null;
  private route: ChatRoute = 'connecting';
  private history: ChatItem[] = [];
  private ready = false;
  constructor(
    private readonly identity: Identity,
    private readonly peer: string,
    private readonly client: Api,
    private readonly chat: NativeChat,
    private readonly journal: ChatJournal,
    private readonly node: NativeSefirah | null,
    private readonly update: (view: DeliveryView) => void,
    private readonly denied: () => void,
    private readonly notificationName?: string,
  ) {}
  private live() {
    if (this.controller.signal.aborted) throw new Error('Chat cancelled');
  }
  private mailbox() {
    const api = this.client.chat();
    if (!api) throw new Error('Chat service unavailable');
    return api;
  }
  private serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.chain.then(() => {
      this.live();
      return work();
    });
    this.chain = next.catch(() => {});
    return next;
  }
  async start(automatic = true) {
    this.live();
    await this.serial(async () => {
      // Render saved messages before handshake/outbox work. Sending remains gated.
      this.history = await this.chat.delivery({ op: 'history' });
      this.publishView(false);
      const phase = await this.chat.handshakeStateAsync();
      if (phase === 'fresh' && this.identity.did > this.peer) await this.chat.keyPackageAsync();
      const pending = await this.chat.pendingAsync();
      this.publishView(
        false,
        phase === 'established' && !pending.some((v) => v.kind === 'WELCOME'),
      );
    });
    // Start the network after the local inbox is visible.
    if (this.node)
      void this.node
        .start(this.identity)
        .then((contact) => {
          if (!this.controller.signal.aborted) this.contact = contact;
        })
        .catch(() => {});
    if (automatic) this.schedule(0);
  }
  /** One foreground preparation pass, also used by a manual refresh. */
  sync() {
    return this.serial(() => this.tick());
  }
  private schedule(delay = 5000) {
    clearTimeout(this.timer);
    if (!this.controller.signal.aborted)
      this.timer = setTimeout(() => {
        void this.serial(() => this.tick())
          .catch((error: unknown) => {
            if (this.controller.signal.aborted) return;
            if (
              error instanceof ChatAccessError ||
              (error instanceof ChatTransportError && error.status === 403)
            ) {
              this.denied();
              this.close();
              return;
            }
            this.route = 'waiting';
            this.publishView(true);
          })
          .finally(() => this.schedule());
      }, delay);
  }
  private recordRoute(route: 'sefirah' | 'cloudflare') {
    this.route =
      this.route === 'mixed' ||
      (this.route === 'sefirah' && route === 'cloudflare') ||
      (this.route === 'cloudflare' && route === 'sefirah')
        ? 'mixed'
        : route;
  }
  private prune(pending: Set<string>) {
    for (const entry of this.journal.entries(this.peer)) {
      if (!pending.has(entry.wireId) || entry.object.expiresAt <= Date.now())
        this.node?.forget(entry.object.id);
    }
    this.journal.prune(this.peer, pending);
  }
  private publishView(problem: boolean, ready = this.ready) {
    this.ready = ready;
    if (!this.controller.signal.aborted)
      this.update({ items: this.history, ready, route: this.route, problem });
  }
  private async primaryObject(contact: PeerContact, id: string): Promise<SealedObject> {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    this.controller.signal.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, 12_000);
    try {
      return await this.node!.get(contact, this.peer, id, controller.signal);
    } finally {
      clearTimeout(timer);
      this.controller.signal.removeEventListener('abort', cancel);
      controller.abort();
    }
  }
  private async tick() {
    await requireAcceptedContact(this.client, this.identity.did, this.peer);
    this.live();
    const api = this.mailbox();
    await this.flush(true);
    const incoming = await api.list(this.peer, this.controller.signal);
    for (const packet of incoming) {
      this.live();
      const hint = openDelivery(this.identity, packet.descriptor, this.peer);
      if (!hint) throw new Error('Unverified chat descriptor');
      let object: SealedObject | null = null;
      if (hint.contact && this.contact && this.node) {
        try {
          object = await this.primaryObject(hint.contact, packet.descriptor.objectId);
          this.recordRoute('sefirah');
        } catch {
          this.live();
        }
      }
      if (!object && packet.fallback) {
        object = await api.get(this.peer, packet.descriptor.objectId, this.controller.signal);
        this.recordRoute('cloudflare');
      }
      if (!object) continue;
      const opened = openDelivery(this.identity, packet.descriptor, this.peer, object);
      if (!opened?.payload) throw new Error('Unverified chat packet');
      this.live();
      const { kind, wire } = opened.payload;
      if (!base64UrlToBytes(wire)) throw new Error('Invalid chat packet');
      this.history = await this.chat.delivery({
        op: kind === 'KEY_PACKAGE' ? 'initiate' : kind === 'WELCOME' ? 'join' : 'receive',
        wire,
      });
      this.live();
      await api.acknowledge(this.peer, packet.descriptor.objectId, this.controller.signal);
      await this.flush(true);
    }
    this.history = await this.chat.delivery({ op: 'history' });
    await this.flush();
    const phase = await this.chat.handshakeStateAsync();
    const current = await this.chat.pendingAsync();
    this.prune(new Set(current.map((v) => v.id)));
    this.publishView(false, phase === 'established' && !current.some((v) => v.kind === 'WELCOME'));
  }
  private async flush(controlOnly = false) {
    const api = this.mailbox();
    const pending = await this.chat.pendingAsync();
    this.prune(new Set(pending.map((v) => v.id)));
    for (const item of pending.filter((item) => !controlOnly || item.kind === 'CONTROL')) {
      this.live();
      let entry = this.journal.entries(this.peer).find((v) => v.wireId === item.id);
      if (!entry) {
        const record = this.history.find((v) => v.wireId === item.id);
        const expiresAt = record?.expiresAt ?? Date.now() + 7 * 86_400_000;
        const envelope = sealDelivery(
          this.identity,
          this.peer,
          {
            kind: item.kind as 'KEY_PACKAGE' | 'WELCOME' | 'APPLICATION' | 'CONTROL',
            wire: bytesToBase64Url(item.wire),
          },
          expiresAt,
          this.contact,
        );
        entry = {
          wireId: item.id,
          ...envelope,
          announcedAt: 0,
          stored: false,
          primary: this.contact !== null,
        };
        this.journal.save(entry);
      }
      if (entry.stored) {
        if (item.kind === 'CONTROL') await this.chat.acknowledgePendingAsync(item.id);
        continue;
      }
      let offered = false;
      if (entry.primary && this.node && this.contact) {
        try {
          await this.node.offer(entry.object);
          offered = true;
        } catch {
          this.live();
        }
      }
      if (offered && entry.announcedAt === 0) {
        await api.publish(this.peer, entry.descriptor, null, this.controller.signal);
        this.live();
        entry = { ...entry, announcedAt: Date.now() };
        this.journal.save(entry);
        this.recordRoute('sefirah');
      }
      // A local offer is volatile. If no peer receipt arrives, keep the exact
      // native ciphertext and upload its existing encrypted wrapper as fallback.
      if (
        !offered ||
        item.kind === 'CONTROL' ||
        (entry.announcedAt > 0 && Date.now() - entry.announcedAt >= 12_000)
      ) {
        await api.publish(
          this.peer,
          entry.descriptor,
          entry.object,
          this.controller.signal,
          item.kind === 'APPLICATION',
          item.kind === 'APPLICATION' ? this.notificationName : undefined,
        );
        this.live();
        this.journal.save({ ...entry, stored: true });
        this.recordRoute('cloudflare');
        if (item.kind === 'CONTROL') await this.chat.acknowledgePendingAsync(item.id);
      }
    }
  }
  read(ids: string[]): Promise<void> {
    return this.serial(async () => {
      await requireAcceptedContact(this.client, this.identity.did, this.peer);
      this.live();
      for (const id of new Set(ids.slice(0, 256))) {
        const item = this.history.find(
          (v) => v.id === id && !v.outgoing && v.readAt === 0 && v.expiresAt > Date.now(),
        );
        if (item) this.history = await this.chat.delivery({ op: 'read', id });
      }
      const current = await this.chat.pendingAsync();
      const phase = await this.chat.handshakeStateAsync();
      this.publishView(
        false,
        phase === 'established' && !current.some((v) => v.kind === 'WELCOME'),
      );
      this.schedule(0);
    });
  }
  send(text: string): Promise<void> {
    return this.serial(async () => {
      await requireAcceptedContact(this.client, this.identity.did, this.peer);
      this.live();
      this.history = await this.chat.delivery({ op: 'send', text });
      this.publishView(false, true);
      this.schedule(0);
    });
  }
  close() {
    clearTimeout(this.timer);
    this.controller.abort();
    this.contact = null;
    this.history = [];
    this.chat.close();
  }
}
