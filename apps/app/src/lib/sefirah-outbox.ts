import { isSealedObject, openText, sealText, type SealedObject } from '@tero/crypto';

export type OutboxStorage = {
  read: (slot: 0 | 1) => string | null;
  write: (slot: 0 | 1, box: string) => void;
};
export type Route = 'sefirah' | 'cloudflare' | 'nearby';
export type Receipt = { id: string; storedAt: number; expiresAt: number };
export type OutboxEntry = { object: SealedObject; receipts: Partial<Record<Route, Receipt>> };
export type Carrier = {
  route: Route;
  put: (object: SealedObject, signal: AbortSignal) => Promise<Receipt>;
};
type Snapshot = { version: 1; revision: number; items: OutboxEntry[] };
const context = 'sefirah-device-outbox/v1';
export const outboxCapacity = 32;
export const outboxSlotLimit = 1024 * 1024;
const snapshotLimit = 512 * 1024;
const routes: Route[] = ['sefirah', 'cloudflare', 'nearby'];
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function validReceipt(value: unknown, object: SealedObject): value is Receipt {
  if (!value || typeof value !== 'object') return false;
  const r = value as Receipt;
  return (
    Object.keys(r).length === 3 &&
    r.id === object.id &&
    r.expiresAt === object.expiresAt &&
    Number.isSafeInteger(r.storedAt) &&
    r.storedAt > 0 &&
    r.storedAt < r.expiresAt
  );
}

function decode(key: Uint8Array, box: string): Snapshot | null {
  if (box.length > outboxSlotLimit) return null;
  const plain = openText(key, context, box);
  if (plain === null || plain.length > snapshotLimit) return null;
  try {
    const s = JSON.parse(plain) as Snapshot;
    if (
      !s ||
      s.version !== 1 ||
      Object.keys(s).length !== 3 ||
      !Number.isSafeInteger(s.revision) ||
      s.revision < 1 ||
      !Array.isArray(s.items) ||
      s.items.length > outboxCapacity
    )
      return null;
    const ids = new Set<string>();
    for (const item of s.items) {
      if (
        !item ||
        Object.keys(item).length !== 2 ||
        !isSealedObject(item.object) ||
        ids.has(item.object.id) ||
        !item.receipts ||
        typeof item.receipts !== 'object' ||
        Array.isArray(item.receipts)
      )
        return null;
      ids.add(item.object.id);
      for (const [route, receipt] of Object.entries(item.receipts)) {
        if (!routes.includes(route as Route) || !validReceipt(receipt, item.object)) return null;
      }
    }
    return s;
  } catch {
    return null;
  }
}

/** One owner per account. Storage methods must be synchronous and report failures. */
export class SefirahOutbox {
  private key: Uint8Array;
  private snapshot: Snapshot;
  private closed = false;
  private sends = new Map<string, AbortController>();
  readonly recovered: boolean;

  constructor(
    private storage: OutboxStorage,
    key: Uint8Array,
    private now = Date.now,
  ) {
    this.key = key.slice();
    let boxes: (string | null)[];
    try {
      boxes = [storage.read(0), storage.read(1)];
    } catch (error) {
      this.key.fill(0);
      throw error;
    }
    const snapshots = boxes.map((box) => (box === null ? null : decode(this.key, box)));
    const valid = snapshots.filter((s): s is Snapshot => s !== null);
    if (valid.length === 0 && boxes.some((b) => b !== null)) {
      this.key.fill(0);
      throw new Error('outbox unreadable');
    }
    this.recovered = boxes.some((b, i) => b !== null && snapshots[i] === null);
    this.snapshot = valid.sort((a, b) => b.revision - a.revision)[0] ?? {
      version: 1,
      revision: 0,
      items: [],
    };
  }

  private assertOpen() {
    if (this.closed) throw new Error('outbox closed');
  }

  private save(items: OutboxEntry[]) {
    this.assertOpen();
    const revision = this.snapshot.revision + 1;
    if (!Number.isSafeInteger(revision)) throw new Error('outbox revision exhausted');
    const next: Snapshot = { version: 1, revision, items };
    const plain = JSON.stringify(next);
    if (items.length > outboxCapacity || plain.length > snapshotLimit)
      throw new Error('outbox full');
    const box = sealText(this.key, context, plain);
    const slot = (revision % 2) as 0 | 1;
    this.storage.write(slot, box);
    if (this.storage.read(slot) !== box) throw new Error('outbox write failed');
    this.snapshot = next;
  }

  entries(): OutboxEntry[] {
    this.assertOpen();
    return copy(this.snapshot.items);
  }

  enqueue(object: SealedObject): void {
    this.assertOpen();
    if (!isSealedObject(object) || object.expiresAt <= this.now())
      throw new Error('invalid object');
    if (this.snapshot.items.some((i) => i.object.id === object.id)) return;
    this.save([...this.snapshot.items, { object: copy(object), receipts: {} }]);
  }

  remove(id: string): void {
    this.assertOpen();
    this.sends.get(id)?.abort();
    const items = this.snapshot.items.filter((i) => i.object.id !== id);
    if (items.length !== this.snapshot.items.length) this.save(items);
  }

  async deliver(id: string, carrier: Carrier): Promise<Receipt> {
    this.assertOpen();
    const route = carrier.route;
    if (!routes.includes(route)) throw new Error('invalid route');
    const entry = this.snapshot.items.find((i) => i.object.id === id);
    if (!entry || entry.object.expiresAt <= this.now()) throw new Error('object unavailable');
    const receipt = entry.receipts[route];
    if (receipt) return copy(receipt);
    if (this.sends.has(id)) throw new Error('delivery in progress');
    const controller = new AbortController();
    this.sends.set(id, controller);
    try {
      const result = await carrier.put(copy(entry.object), controller.signal);
      this.assertOpen();
      if (controller.signal.aborted) throw new Error('delivery cancelled');
      if (entry.object.expiresAt <= this.now() || !validReceipt(result, entry.object)) {
        throw new Error('invalid receipt');
      }
      this.save(
        this.snapshot.items.map((item) =>
          item.object.id === id
            ? { ...item, receipts: { ...item.receipts, [route]: copy(result) } }
            : item,
        ),
      );
      return copy(result);
    } finally {
      if (this.sends.get(id) === controller) this.sends.delete(id);
    }
  }

  close(): void {
    this.closed = true;
    for (const controller of this.sends.values()) controller.abort();
    this.sends.clear();
    this.key.fill(0);
    this.snapshot = { version: 1, revision: 0, items: [] };
  }
}
