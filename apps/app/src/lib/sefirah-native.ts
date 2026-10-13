import { requireOptionalNativeModule } from 'expo-modules-core';
import {
  bytesToBase64Url,
  randomBytes,
  isSealedObject,
  isSealedObjectId,
  signPeerContact,
  identityFromSeed,
  openPost,
  sealPost,
  verifyPeerContact,
  type Identity,
  type PeerContact,
  type SealedObject,
} from '@tero/crypto';

type NativeTor = {
  enabled: boolean;
  start(handle: string, request: string, capability: string): Promise<string>;
  offer(handle: string, objectJson: string): Promise<string>;
  get(
    handle: string,
    request: string,
    onion: string,
    capability: string,
    id: string,
  ): Promise<string>;
  forget?(handle: string, id: string): string;
  cancel(request: string): void;
  stop(handle: string): void;
};
const native = requireOptionalNativeModule<NativeTor>('SefirahTor');
const identifier = () => bytesToBase64Url(randomBytes(16));
function result(text: string): unknown {
  if (text.length > 70 * 1024) throw new Error('native response too large');
  const reply = JSON.parse(text) as { ok?: boolean; value?: unknown };
  if (reply.ok !== true) throw new Error('Sefirah native transport unavailable');
  return reply.value;
}

/** Owns one native runtime session. No direct peer IP or automatic HTTP fallback. */
export class NativeSefirah {
  static readonly available = native?.enabled === true;
  private readonly handle = identifier();
  private readonly capability = bytesToBase64Url(randomBytes(32));
  private closed = false;
  private contact: PeerContact | null = null;
  private starting: Promise<PeerContact> | null = null;
  private requests = new Set<string>();

  private assertOpen() {
    if (this.closed || !NativeSefirah.available)
      throw new Error('Sefirah native transport unavailable');
  }

  start(identity: Identity): Promise<PeerContact> {
    this.assertOpen();
    if (this.contact) {
      if (this.contact.owner !== identity.did) throw new Error('native session owner mismatch');
      if (this.contact.expiresAt <= Date.now()) {
        const now = Date.now();
        this.contact = signPeerContact(
          identity,
          this.contact.onion,
          this.capability,
          now,
          now + 24 * 60 * 60_000,
        );
      }
      return Promise.resolve({ ...this.contact });
    }
    if (this.starting) return this.starting;
    const request = identifier();
    this.requests.add(request);
    this.starting = (async () => {
      try {
        const value = result(await native!.start(this.handle, request, this.capability)) as {
          onion?: unknown;
        };
        if (this.closed) {
          native!.stop(this.handle);
          throw new Error('Sefirah session closed');
        }
        if (typeof value?.onion !== 'string') throw new Error('invalid native address');
        const now = Date.now();
        this.contact = signPeerContact(
          identity,
          value.onion,
          this.capability,
          now,
          now + 24 * 60 * 60_000,
        );
        return { ...this.contact };
      } catch (error) {
        native!.stop(this.handle);
        this.closed = true;
        throw error;
      } finally {
        this.requests.delete(request);
        this.starting = null;
      }
    })();
    return this.starting;
  }

  async offer(object: SealedObject): Promise<void> {
    this.assertOpen();
    if (
      !this.contact ||
      this.contact.expiresAt <= Date.now() ||
      !isSealedObject(object) ||
      object.expiresAt <= Date.now()
    ) {
      throw new Error('invalid peer offer');
    }
    result(await native!.offer(this.handle, JSON.stringify(object)));
    this.assertOpen();
    // Available only while this native session is running. Not a durable receipt.
  }

  async get(
    contact: PeerContact,
    expectedOwner: string,
    id: string,
    signal: AbortSignal,
  ): Promise<SealedObject> {
    this.assertOpen();
    if (
      !this.contact ||
      !verifyPeerContact(contact, expectedOwner, Date.now()) ||
      !isSealedObjectId(id)
    ) {
      throw new Error('untrusted peer contact');
    }
    if (signal.aborted) throw new Error('peer request cancelled');
    const request = identifier();
    const cancel = () => native!.cancel(request);
    this.requests.add(request);
    signal.addEventListener('abort', cancel, { once: true });
    try {
      const object = result(
        await native!.get(this.handle, request, contact.onion, contact.capability, id),
      );
      this.assertOpen();
      if (signal.aborted) throw new Error('peer request cancelled');
      if (!isSealedObject(object) || object.id !== id || object.expiresAt <= Date.now()) {
        throw new Error('invalid peer object');
      }
      // Caller must still decrypt and verify its independently expected content author.
      return object;
    } finally {
      signal.removeEventListener('abort', cancel);
      this.requests.delete(request);
    }
  }

  /** Remove a volatile carrier copy when its native retry record is consumed/expired. */
  forget(id: string): void {
    if (this.closed || !this.contact) return;
    if (!isSealedObjectId(id)) throw new Error('Invalid object id');
    try {
      if (!native?.forget) { this.close(); return; }
      result(native.forget(this.handle, id));
    } catch { this.close(); }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.contact = null;
    for (const request of this.requests) native?.cancel(request);
    this.requests.clear();
    native?.stop(this.handle);
  }
}

/** Synthetic self retrieval through the real native onion route, not two-device chat delivery. */
export async function probeNativePrimary(signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw new Error('Private route probe cancelled');
  if (!NativeSefirah.available) throw new Error('Native Sefirah transport unavailable');
  const identity = identityFromSeed(randomBytes(64));
  const key = randomBytes(32);
  const node = new NativeSefirah();
  const cancel = () => node.close();
  signal.addEventListener('abort', cancel, { once: true });
  try {
    const contact = await node.start(identity);
    if (signal.aborted) throw new Error('Private route probe cancelled');
    const object = sealPost(
      key,
      identity.secretKey,
      'Synthetic native private route check',
      Date.now() + 60 * 60_000,
    );
    await node.offer(object);
    const fetched = await node.get(contact, identity.did, object.id, signal);
    const opened = openPost(key, fetched, identity.did, Date.now());
    if (opened?.text !== 'Synthetic native private route check')
      throw new Error('Private route probe verification failed');
  } finally {
    signal.removeEventListener('abort', cancel);
    try {
      node.close();
    } finally {
      key.fill(0);
      identity.secretKey.fill(0);
    }
  }
}
