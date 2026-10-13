import { openText, sealText, verifyPeerContact, type PeerContact } from '@tero/crypto';
import { outboxSlotLimit, type OutboxStorage } from './sefirah-outbox';

type Snapshot = { version: 1; revision: number; contacts: PeerContact[] };
const context = 'sefirah-private-peers/v1';
const copy = (c: PeerContact) => ({ ...c });

/** Private, manually pinned contacts. No global roster or automatic trust discovery. */
export class SefirahPeers {
  private key: Uint8Array;
  private snapshot: Snapshot = { version: 1, revision: 0, contacts: [] };
  private closed = false;
  readonly recovered: boolean;
  constructor(
    private storage: OutboxStorage,
    secret: Uint8Array,
  ) {
    this.key = secret.slice();
    try {
      const slots = [storage.read(0), storage.read(1)];
      const decoded = slots.map((box): Snapshot | null => {
        if (box === null || box.length > outboxSlotLimit) return null;
        const plain = openText(this.key, context, box);
        if (plain === null || plain.length > 32 * 1024) return null;
        try {
          const s = JSON.parse(plain) as Snapshot;
          if (
            !s ||
            Object.keys(s).length !== 3 ||
            s.version !== 1 ||
            !Number.isSafeInteger(s.revision) ||
            s.revision < 1 ||
            !Array.isArray(s.contacts) ||
            s.contacts.length > 32
          )
            return null;
          const owners = new Set<string>();
          for (const c of s.contacts) {
            // Stored contacts were explicitly pinned before sealing. Verify their
            // original signatures even when expired; expiry is enforced on use.
            if (!c || !verifyPeerContact(c, c.owner, c.issuedAt) || owners.has(c.owner))
              return null;
            owners.add(c.owner);
          }
          return s;
        } catch {
          return null;
        }
      });
      const valid = decoded.filter((s): s is Snapshot => s !== null);
      if (!valid.length && slots.some((box) => box !== null))
        throw new Error('peer directory unreadable');
      this.recovered = slots.some((box, i) => box !== null && decoded[i] === null);
      this.snapshot = valid.sort((a, b) => b.revision - a.revision)[0] ?? this.snapshot;
    } catch (error) {
      this.key.fill(0);
      throw error;
    }
  }
  private assertOpen() {
    if (this.closed) throw new Error('peer directory closed');
  }
  list(): PeerContact[] {
    this.assertOpen();
    return this.snapshot.contacts.map(copy);
  }
  find(owner: string, now = Date.now()): PeerContact | null {
    this.assertOpen();
    const c = this.snapshot.contacts.find((c) => c.owner === owner);
    return c && verifyPeerContact(c, owner, now) ? copy(c) : null;
  }
  private save(contacts: PeerContact[]) {
    this.assertOpen();
    const next: Snapshot = { version: 1, revision: this.snapshot.revision + 1, contacts };
    if (contacts.length > 32 || !Number.isSafeInteger(next.revision))
      throw new Error('peer directory full');
    const plain = JSON.stringify(next);
    if (plain.length > 32 * 1024) throw new Error('peer directory full');
    const box = sealText(this.key, context, plain);
    const slot = (next.revision % 2) as 0 | 1;
    this.storage.write(slot, box);
    if (this.storage.read(slot) !== box) throw new Error('peer directory write failed');
    this.snapshot = next;
  }
  add(contact: unknown, expectedOwner: string, now = Date.now()): void {
    this.assertOpen();
    if (!verifyPeerContact(contact, expectedOwner, now)) throw new Error('untrusted peer contact');
    const previous = this.snapshot.contacts.find((c) => c.owner === expectedOwner);
    if (previous && contact.issuedAt <= previous.issuedAt) {
      if (JSON.stringify(previous) === JSON.stringify(contact)) return;
      throw new Error('stale peer contact');
    }
    this.save([...this.snapshot.contacts.filter((c) => c.owner !== expectedOwner), copy(contact)]);
  }
  remove(owner: string): void {
    this.assertOpen();
    this.save(this.snapshot.contacts.filter((c) => c.owner !== owner));
  }
  close(): void {
    this.closed = true;
    this.key.fill(0);
    this.snapshot = { version: 1, revision: 0, contacts: [] };
  }
}
