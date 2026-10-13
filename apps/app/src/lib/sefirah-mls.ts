import { requireOptionalNativeModule } from 'expo-modules-core';
import {
  bytesToBase64Url,
  identityFromSeed,
  pseudonym,
  randomBytes,
  type Identity,
} from '@tero/crypto';

export type PendingMessage = { id: string; kind: string; wire: Uint8Array };
type ReceivedMessage = { id: string; text: string };
export type ChatItem = {
  id: string;
  text: string;
  outgoing: boolean;
  sentAt: number;
  deliveredAt: number;
  readAt: number;
  peerReadAt: number;
  expiresAt: number;
  wireId: string;
};
export type HandshakeState = 'fresh' | 'offered' | 'established';

type MlsBridge = {
  enabled: boolean;
  storageVersion?: number;
  queueVersion?: number;
  asyncVersion?: number;
  deliveryVersion?: number;
  deliveryAsync(handle: string, request: string): Promise<string>;
  registerOwner(owner: string): void;
  closeOwner(owner: string): void;
  openAsync(
    owner: string,
    secret: Uint8Array,
    peer: string,
    key: Uint8Array,
    namespace: string,
    probe: boolean,
  ): Promise<string>;
  pendingAsync(handle: string): Promise<PendingMessage[]>;
  receivedAsync(handle: string): Promise<ReceivedMessage[]>;
  handshakeStateAsync(handle: string): Promise<HandshakeState>;
  acknowledgePendingAsync(handle: string, id: string): Promise<boolean>;
  keyPackageAsync(handle: string): Promise<Uint8Array>;
  initiateAsync(handle: string, bytes: Uint8Array): Promise<Uint8Array>;
  joinAsync(handle: string, bytes: Uint8Array): Promise<void>;
  encryptAsync(handle: string, text: string): Promise<Uint8Array>;
  decryptAsync(handle: string, bytes: Uint8Array): Promise<string>;
  create(secret: Uint8Array, peer: string): string;
  open(
    secret: Uint8Array,
    peer: string,
    key: Uint8Array,
    namespace: string,
    probe: boolean,
  ): string;
  pending(handle: string): PendingMessage[];
  received(handle: string): ReceivedMessage[];
  handshakeState(handle: string): HandshakeState;
  acknowledgePending(handle: string, id: string): boolean;
  clearProbe(namespace: string): void;
  keyPackage(handle: string): Uint8Array;
  initiate(handle: string, keyPackage: Uint8Array): Uint8Array;
  join(handle: string, welcome: Uint8Array): void;
  encrypt(handle: string, text: string): Uint8Array;
  decrypt(handle: string, wire: Uint8Array): string;
  close(handle: string): void;
};
const native = requireOptionalNativeModule<MlsBridge>('SefirahMls');

/** Owns native engines and the storage key; foreground delivery is managed separately. */
export class SefirahMessages {
  static readonly available = native?.enabled === true;
  static readonly persistentAvailable = native?.enabled === true && native.storageVersion === 1;
  static get queueAvailable() {
    return native?.enabled === true && native.queueVersion === 1;
  }
  static get asyncAvailable() {
    return native?.enabled === true && native.storageVersion === 1 && native.asyncVersion === 1;
  }
  static get deliveryAvailable() {
    return SefirahMessages.asyncAvailable && native?.deliveryVersion === 1;
  }
  private readonly asyncOwners = new Set<string>();
  private closed = false;
  private conversations = new Set<NativePrivateChat>();
  private storageKey: Uint8Array | null;
  private probeNamespaces = new Set<string>();

  constructor(
    storageKey?: Uint8Array,
    private readonly probe = false,
  ) {
    if (storageKey && storageKey.length !== 32) throw new Error('Invalid message storage key');
    this.storageKey = storageKey?.slice() ?? null;
    if (probe && !storageKey) throw new Error('Probe storage key required');
  }

  /** Caller must obtain the peer from accepted-contact state before real use. */
  create(identity: Identity, peer: string): NativePrivateChat {
    if (this.closed || !SefirahMessages.available) throw new Error('Native messaging unavailable');
    const secret = identity.secretKey.slice();
    const key = this.storageKey?.slice();
    try {
      let handle: string;
      if (key) {
        if (!SefirahMessages.persistentAvailable)
          throw new Error('Native message storage unavailable');
        const namespace = pseudonym(
          bytesToBase64Url(key),
          'private-message-state/v1',
          `${identity.did}/${peer}`,
        );
        if (this.probe) this.probeNamespaces.add(namespace);
        handle = native!.open(secret, peer, key, namespace, this.probe);
      } else {
        handle = native!.create(secret, peer);
      }
      const chat = new NativePrivateChat(handle, () => {
        this.conversations.delete(chat);
      });
      this.conversations.add(chat);
      return chat;
    } finally {
      secret.fill(0);
      key?.fill(0);
    }
  }

  /** Persistent path. Each open has a native lifetime, including while queued. */
  async createAsync(
    identity: Identity,
    peer: string,
    signal?: AbortSignal,
  ): Promise<NativePrivateChat> {
    if (this.closed || signal?.aborted || !SefirahMessages.asyncAvailable || !this.storageKey)
      throw new Error('Async native message storage unavailable');
    const owner = bytesToBase64Url(randomBytes(16));
    native!.registerOwner(owner);
    this.asyncOwners.add(owner);
    const cancel = () => {
      this.asyncOwners.delete(owner);
      try {
        native!.closeOwner(owner);
      } catch {
        /* Native teardown remains a final guard. */
      }
    };
    signal?.addEventListener('abort', cancel, { once: true });
    const secret = identity.secretKey.slice();
    const key = this.storageKey.slice();
    let retained = false;
    try {
      const namespace = pseudonym(
        bytesToBase64Url(key),
        'private-message-state/v1',
        `${identity.did}/${peer}`,
      );
      if (this.probe) this.probeNamespaces.add(namespace);
      const handle = await native!.openAsync(owner, secret, peer, key, namespace, this.probe);
      if (this.closed || signal?.aborted) {
        native!.close(handle);
        throw new Error('Conversation closed');
      }
      const chat = new NativePrivateChat(handle, () => {
        signal?.removeEventListener('abort', cancelChat);
        this.conversations.delete(chat);
        cancel();
      });
      const cancelChat = () => chat.close();
      signal?.removeEventListener('abort', cancel);
      signal?.addEventListener('abort', cancelChat, { once: true });
      this.conversations.add(chat);
      retained = true;
      return chat;
    } finally {
      secret.fill(0);
      key.fill(0);
      if (!retained) {
        signal?.removeEventListener('abort', cancel);
        cancel();
      }
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const owner of this.asyncOwners) {
      try {
        native!.closeOwner(owner);
      } catch {
        /* Continue wiping JS-owned state. */
      }
    }
    this.asyncOwners.clear();
    // A failed disposal must not prevent other engines from being closed.
    for (const chat of [...this.conversations]) {
      try {
        chat.close();
      } catch {
        // Native OnDestroy also closes retained engines; no key details logged.
      }
    }
    this.conversations.clear();
    this.storageKey?.fill(0);
    this.storageKey = null;
    for (const namespace of this.probeNamespaces) {
      try {
        native!.clearProbe(namespace);
      } catch {
        /* Synthetic cache only. */
      }
    }
    this.probeNamespaces.clear();
  }
}

class NativePrivateChat {
  private closed = false;
  constructor(
    private readonly handle: string,
    private readonly dispose: () => void,
  ) {}

  private assertOpen() {
    if (this.closed) throw new Error('Conversation closed');
  }
  private async run<T>(operation: () => Promise<T>): Promise<T> {
    this.assertOpen();
    if (!SefirahMessages.asyncAvailable) throw new Error('Async native messaging unavailable');
    const result = await operation();
    this.assertOpen();
    return result;
  }
  async delivery(action: Record<string, unknown>): Promise<ChatItem[]> {
    if (!SefirahMessages.deliveryAvailable) throw new Error('Native chat delivery unavailable');
    const json = await this.run(() => native!.deliveryAsync(this.handle, JSON.stringify(action)));
    if (json.length > 2 * 1024 * 1024) throw new Error('Invalid native history');
    const items: unknown = JSON.parse(json);
    if (
      !Array.isArray(items) ||
      items.length > 256 ||
      items.some(
        (item) =>
          !item ||
          typeof item.id !== 'string' ||
          typeof item.text !== 'string' ||
          typeof item.outgoing !== 'boolean',
      )
    )
      throw new Error('Invalid native history');
    return items as ChatItem[];
  }
  pendingAsync() {
    return this.run(() => native!.pendingAsync(this.handle));
  }
  receivedAsync() {
    return this.run(() => native!.receivedAsync(this.handle));
  }
  async handshakeStateAsync(): Promise<HandshakeState> {
    const state = await this.run(() => native!.handshakeStateAsync(this.handle));
    if (!['fresh', 'offered', 'established'].includes(state))
      throw new Error('Invalid native handshake state');
    return state;
  }
  acknowledgePendingAsync(id: string) {
    return this.run(() => native!.acknowledgePendingAsync(this.handle, id));
  }
  keyPackageAsync() {
    return this.run(() => native!.keyPackageAsync(this.handle));
  }
  initiateAsync(bytes: Uint8Array) {
    return this.run(() => native!.initiateAsync(this.handle, bytes));
  }
  joinAsync(bytes: Uint8Array) {
    return this.run(() => native!.joinAsync(this.handle, bytes));
  }
  encryptAsync(text: string) {
    return this.run(() => native!.encryptAsync(this.handle, text));
  }
  decryptAsync(bytes: Uint8Array) {
    return this.run(() => native!.decryptAsync(this.handle, bytes));
  }
  pending(): PendingMessage[] {
    this.assertOpen();
    return native!.pending(this.handle);
  }
  received(): ReceivedMessage[] {
    this.assertOpen();
    return native!.received(this.handle);
  }
  handshakeState(): HandshakeState {
    this.assertOpen();
    if (!SefirahMessages.queueAvailable) throw new Error('Native delivery primitives unavailable');
    const state = native!.handshakeState(this.handle);
    if (!['fresh', 'offered', 'established'].includes(state))
      throw new Error('Invalid native handshake state');
    return state;
  }
  /** Consumes local retry bytes only. The caller must verify the matching acknowledgement. */
  acknowledgePending(id: string): boolean {
    this.assertOpen();
    if (!SefirahMessages.queueAvailable) throw new Error('Native delivery primitives unavailable');
    return native!.acknowledgePending(this.handle, id);
  }
  keyPackage(): Uint8Array {
    this.assertOpen();
    return native!.keyPackage(this.handle);
  }
  initiate(keyPackage: Uint8Array): Uint8Array {
    this.assertOpen();
    return native!.initiate(this.handle, keyPackage);
  }
  join(welcome: Uint8Array): void {
    this.assertOpen();
    native!.join(this.handle, welcome);
  }
  encrypt(text: string): Uint8Array {
    this.assertOpen();
    return native!.encrypt(this.handle, text);
  }
  decrypt(wire: Uint8Array): string {
    this.assertOpen();
    return native!.decrypt(this.handle, wire);
  }
  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      native!.close(this.handle);
    } finally {
      this.dispose();
    }
  }
}

/** Development-only proof of the complete JS → mobile module → UniFFI → Rust path. */
export function probeNativeMessages(): void {
  const aliceIdentity = identityFromSeed(new Uint8Array(64).fill(1));
  const bobIdentity = identityFromSeed(new Uint8Array(64).fill(2));
  const owner = new SefirahMessages();
  try {
    const alice = owner.create(aliceIdentity, bobIdentity.did);
    const bob = owner.create(bobIdentity, aliceIdentity.did);
    bob.join(alice.initiate(bob.keyPackage()));
    const wire = alice.encrypt('Synthetic native bridge check 🌈');
    if (bob.decrypt(wire) !== 'Synthetic native bridge check 🌈') throw new Error('MLS mismatch');
    let replayRejected = false;
    try {
      bob.decrypt(wire);
    } catch {
      replayRejected = true;
    }
    if (!replayRejected || alice.decrypt(bob.encrypt('Reply')) !== 'Reply')
      throw new Error('MLS verification failed');
  } finally {
    owner.close();
    aliceIdentity.secretKey.fill(0);
    bobIdentity.secretKey.fill(0);
  }
}

/** Reopens real native SQLite state using synthetic identities and disposable cache files. */
export function probeNativeMessagePersistence(): void {
  const aliceIdentity = identityFromSeed(new Uint8Array(64).fill(1));
  const bobIdentity = identityFromSeed(new Uint8Array(64).fill(2));
  const aliceKey = randomBytes(32);
  const bobKey = randomBytes(32);
  const aliceOwner = new SefirahMessages(aliceKey, true);
  const bobOwner = new SefirahMessages(bobKey, true);
  try {
    let alice = aliceOwner.create(aliceIdentity, bobIdentity.did);
    let bob = bobOwner.create(bobIdentity, aliceIdentity.did);
    const packageBytes = bob.keyPackage();
    bob.close();
    bob = bobOwner.create(bobIdentity, aliceIdentity.did);
    const queuedPackage = bob.pending()[0];
    if (
      !queuedPackage ||
      queuedPackage.wire.length !== packageBytes.length ||
      !queuedPackage.wire.every((byte, i) => byte === packageBytes[i])
    )
      throw new Error('Missing KeyPackage');
    if (SefirahMessages.queueAvailable && bob.handshakeState() !== 'offered')
      throw new Error('Missing saved handshake phase');
    const welcome = alice.initiate(queuedPackage.wire);
    alice.close();
    alice = aliceOwner.create(aliceIdentity, bobIdentity.did);
    bob.join(welcome);
    if (SefirahMessages.queueAvailable) {
      const queuedWelcome = alice.pending().find((item) => item.kind === 'WELCOME');
      if (
        !queuedWelcome ||
        alice.handshakeState() !== 'established' ||
        bob.handshakeState() !== 'established' ||
        !bob.acknowledgePending(queuedPackage.id) ||
        !alice.acknowledgePending(queuedWelcome.id)
      )
        throw new Error('Handshake queue consumption failed');
    }
    bob.close();
    bob = bobOwner.create(bobIdentity, aliceIdentity.did);
    const wire = alice.encrypt('Synthetic persistent message 🌈');
    alice.close();
    alice = aliceOwner.create(aliceIdentity, bobIdentity.did);
    const queuedMessage = alice
      .pending()
      .find(
        (item) =>
          item.wire.length === wire.length && item.wire.every((byte, i) => byte === wire[i]),
      );
    if (!queuedMessage) throw new Error('Missing queued message');
    if (bob.decrypt(wire) !== 'Synthetic persistent message 🌈')
      throw new Error('Restart decrypt failed');
    bob.close();
    bob = bobOwner.create(bobIdentity, aliceIdentity.did);
    if (bob.received()[0]?.text !== 'Synthetic persistent message 🌈')
      throw new Error('Missing inbox');
    if (SefirahMessages.queueAvailable) {
      if (!alice.acknowledgePending(queuedMessage.id)) throw new Error('Queue consumption failed');
      alice.close();
      alice = aliceOwner.create(aliceIdentity, bobIdentity.did);
      if (
        alice.pending().some((item) => item.id === queuedMessage.id) ||
        alice.acknowledgePending(queuedMessage.id)
      )
        throw new Error('Queue consumption did not persist');
    }
    if (alice.decrypt(bob.encrypt('Reply after restart')) !== 'Reply after restart')
      throw new Error('Restart reply failed');
    let replayRejected = false;
    try {
      bob.decrypt(wire);
    } catch {
      replayRejected = true;
    }
    if (!replayRejected) throw new Error('Replay accepted after restart');
  } finally {
    aliceOwner.close();
    bobOwner.close();
    aliceKey.fill(0);
    bobKey.fill(0);
    aliceIdentity.secretKey.fill(0);
    bobIdentity.secretKey.fill(0);
  }
}
