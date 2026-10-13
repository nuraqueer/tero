import {
  isSealedObject,
  isSealedObjectId,
  openText,
  sealText,
  verifyDeliveryDescriptor,
  type DeliveryDescriptor,
  type SealedObject,
} from '@tero/crypto';
import { outboxSlotLimit, type OutboxStorage } from './sefirah-outbox';
export type JournalEntry = {
  wireId: string;
  descriptor: DeliveryDescriptor;
  object: SealedObject;
  announcedAt: number;
  stored: boolean;
  primary: boolean;
};
type Snapshot = { version: 1; revision: number; entries: JournalEntry[] };
const context = 'tero-private-delivery-journal/v1';
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
/** Stores carrier wrappers, never MLS ratchets. Native pending bytes remain authoritative. */
export class ChatJournal {
  private key: Uint8Array;
  private state: Snapshot = { version: 1, revision: 0, entries: [] };
  private closed = false;
  constructor(
    private storage: OutboxStorage,
    key: Uint8Array,
  ) {
    this.key = key.slice();
    try {
      const boxes = [storage.read(0), storage.read(1)];
      const decoded = boxes
        .map((box): Snapshot | null => {
          if (!box || box.length > outboxSlotLimit) return null;
          const plain = openText(this.key, context, box);
          if (!plain || plain.length > 512 * 1024) return null;
          try {
            const v = JSON.parse(plain) as Snapshot;
            if (
              v.version !== 1 ||
              !Number.isSafeInteger(v.revision) ||
              v.revision < 1 ||
              !Array.isArray(v.entries) ||
              v.entries.length > 64
            )
              return null;
            const ids = new Set<string>();
            for (const e of v.entries) {
              // Expired descriptors remain authentic; expiration is applied before use.
              if (
                !e ||
                !isSealedObjectId(e.wireId) ||
                ids.has(e.wireId) ||
                !isSealedObject(e.object) ||
                !verifyDeliveryDescriptor(e.descriptor, e.descriptor.expiresAt - 1) ||
                e.descriptor.objectId !== e.object.id ||
                e.descriptor.expiresAt !== e.object.expiresAt ||
                !Number.isSafeInteger(e.announcedAt) ||
                e.announcedAt < 0 ||
                typeof e.stored !== 'boolean' ||
                typeof e.primary !== 'boolean'
              )
                return null;
              ids.add(e.wireId);
            }
            return v;
          } catch {
            return null;
          }
        })
        .filter((v): v is Snapshot => v !== null);
      if (!decoded.length && boxes.some((b) => b !== null))
        throw new Error('Chat retry storage unavailable');
      this.state = decoded.sort((a, b) => b.revision - a.revision)[0] ?? this.state;
    } catch (error) {
      this.key.fill(0);
      throw error;
    }
  }
  private assertOpen() {
    if (this.closed) throw new Error('Chat retry storage closed');
  }
  entries(peer: string) {
    this.assertOpen();
    return clone(this.state.entries.filter((e) => e.descriptor.recipient === peer));
  }
  save(entry: JournalEntry) {
    this.assertOpen();
    const entries = [...this.state.entries.filter((e) => e.wireId !== entry.wireId), clone(entry)];
    this.commit(entries);
  }
  prune(peer: string, pending: Set<string>) {
    this.assertOpen();
    const entries = this.state.entries.filter(
      (e) =>
        e.descriptor.recipient !== peer ||
        (pending.has(e.wireId) && e.object.expiresAt > Date.now()),
    );
    if (entries.length !== this.state.entries.length) this.commit(entries);
  }
  private commit(entries: JournalEntry[]) {
    const next = { version: 1 as const, revision: this.state.revision + 1, entries };
    const plain = JSON.stringify(next);
    if (!Number.isSafeInteger(next.revision) || entries.length > 64 || plain.length > 512 * 1024)
      throw new Error('Chat retry storage full');
    const box = sealText(this.key, context, plain);
    const slot = (next.revision % 2) as 0 | 1;
    this.storage.write(slot, box);
    if (this.storage.read(slot) !== box) throw new Error('Chat retry write failed');
    this.state = next;
  }
  close() {
    this.closed = true;
    this.key.fill(0);
    this.state.entries = [];
  }
}
