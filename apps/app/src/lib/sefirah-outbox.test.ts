import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { randomBytes, sealPost } from '@tero/crypto';
import { SefirahOutbox, type Carrier, type OutboxStorage, type Receipt } from './sefirah-outbox';

const now = 1_800_000_000_000;
const key = randomBytes(32);
const signingKey = randomBytes(32);
const object = (text = 'private development post') =>
  sealPost(randomBytes(32), signingKey, text, now + 60_000);
const directories: string[] = [];
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'tero-outbox-test-'));
  directories.push(directory);
  const path = (slot: 0 | 1) => join(directory, `${slot}.box`);
  const storage: OutboxStorage = {
    read: (slot) => (existsSync(path(slot)) ? readFileSync(path(slot), 'utf8') : null),
    write: (slot, box) => writeFileSync(path(slot), box, { mode: 0o600 }),
  };
  const open = (secret = key) => new SefirahOutbox(storage, secret, () => now);
  return { storage, open, path };
}
const receipt = (id: string): Receipt => ({ id, storedAt: now, expiresAt: now + 60_000 });
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('encrypted device outbox', () => {
  it('reconstructs from real files without plaintext objects or delivery state', async () => {
    const f = fixture();
    const post = object();
    const queue = f.open();
    queue.enqueue(post);
    await queue.deliver(post.id, { route: 'cloudflare', put: async () => receipt(post.id) });
    queue.close();
    const restored = f.open();
    expect(restored.entries()).toEqual([
      { object: post, receipts: { cloudflare: receipt(post.id) } },
    ]);
    for (const slot of [0, 1] as const) {
      const disk = f.storage.read(slot)!;
      expect(disk).not.toContain(post.id);
      expect(disk).not.toContain(post.box);
      expect(disk).not.toContain('cloudflare');
      expect(disk).not.toContain('private development post');
    }
  });

  it('retries unchanged bytes after uncertain delivery and preserves other routes', async () => {
    const f = fixture();
    const post = object();
    f.open().enqueue(post);
    const queue = f.open();
    const received: unknown[] = [];
    let fail = true;
    const carrier: Carrier = {
      route: 'cloudflare',
      put: async (sent) => {
        received.push(sent);
        if (fail) {
          fail = false;
          throw new Error('connection lost after storage');
        }
        return receipt(post.id);
      },
    };
    await expect(queue.deliver(post.id, carrier)).rejects.toThrow('connection lost');
    await queue.deliver(post.id, carrier);
    await queue.deliver(post.id, carrier);
    await queue.deliver(post.id, {
      route: 'sefirah',
      put: async (sent) => {
        received.push(sent);
        return receipt(post.id);
      },
    });
    expect(received).toEqual([post, post, post]);
    expect(Object.keys(queue.entries()[0].receipts)).toEqual(['cloudflare', 'sefirah']);
  });

  it('recovers the previous snapshot after an interrupted write', () => {
    const f = fixture();
    const queue = f.open();
    const first = object('first');
    queue.enqueue(first);
    const original = f.storage.write;
    f.storage.write = (slot, box) => {
      original(slot, box.slice(0, 30));
      throw new Error('disk interrupted');
    };
    expect(() => queue.enqueue(object('not accepted'))).toThrow('disk interrupted');
    const restored = f.open();
    expect(restored.recovered).toBe(true);
    expect(restored.entries().map((i) => i.object)).toEqual([first]);
  });

  it('rejects unreadable state and wrong keys without replacing existing bytes', () => {
    const f = fixture();
    f.open().enqueue(object());
    const before = f.storage.read(1);
    expect(() => f.open(randomBytes(32))).toThrow('outbox unreadable');
    expect(f.storage.read(1)).toBe(before);
    writeFileSync(f.path(1), 'damaged');
    expect(() => f.open()).toThrow('outbox unreadable');
  });

  it('does not acknowledge a write that fails readback', () => {
    const f = fixture();
    const queue = f.open();
    f.storage.write = () => undefined;
    expect(() => queue.enqueue(object())).toThrow('outbox write failed');
    expect(queue.entries()).toEqual([]);
  });

  it('rejects overflow without evicting queued posts and isolates returned values', () => {
    const f = fixture();
    const queue = f.open();
    for (let n = 0; n < 32; n++) queue.enqueue(object(String(n)));
    const before = queue.entries();
    expect(() => queue.enqueue(object('overflow'))).toThrow('outbox full');
    queue.entries()[0].object.box = 'changed';
    expect(f.open().entries()).toEqual(before);
    queue.enqueue(before[0].object);
    expect(queue.entries()).toEqual(before);
  });

  it('enforces the byte budget before the object count budget', () => {
    const queue = fixture().open();
    let accepted = 0;
    expect(() => {
      for (; accepted < 32; accepted++) queue.enqueue(object('a'.repeat(32 * 1024)));
    }).toThrow('outbox full');
    expect(accepted).toBeLessThan(32);
    expect(queue.entries()).toHaveLength(accepted);
  });

  it('rejects mismatched receipts and leaves the entry pending', async () => {
    const queue = fixture().open();
    const post = object();
    queue.enqueue(post);
    for (const bad of [
      { ...receipt(post.id), id: 'wrong' },
      { ...receipt(post.id), expiresAt: post.expiresAt + 1 },
      { ...receipt(post.id), storedAt: 0 },
      { ...receipt(post.id), storedAt: post.expiresAt },
    ]) {
      await expect(
        queue.deliver(post.id, { route: 'cloudflare', put: async () => bad }),
      ).rejects.toThrow('invalid receipt');
    }
    expect(queue.entries()[0].receipts).toEqual({});
  });

  it('cancels on lock and ignores a late successful response', async () => {
    const f = fixture();
    const queue = f.open();
    const post = object();
    queue.enqueue(post);
    let finish!: (r: Receipt) => void;
    let signal!: AbortSignal;
    const carrier: Carrier = {
      route: 'cloudflare',
      put: (_, s) => {
        signal = s;
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    };
    const delivery = queue.deliver(post.id, carrier);
    await expect(queue.deliver(post.id, carrier)).rejects.toThrow('delivery in progress');
    queue.close();
    expect(signal.aborted).toBe(true);
    finish(receipt(post.id));
    await expect(delivery).rejects.toThrow('outbox closed');
    expect(() => queue.entries()).toThrow('outbox closed');
    expect(f.open().entries()[0].receipts).toEqual({});
  });

  it('does not send expired entries or remove them silently', async () => {
    const f = fixture();
    const queue = f.open();
    const post = object();
    queue.enqueue(post);
    const expired = new SefirahOutbox(f.storage, key, () => post.expiresAt);
    let called = false;
    await expect(
      expired.deliver(post.id, {
        route: 'cloudflare',
        put: async () => {
          called = true;
          return receipt(post.id);
        },
      }),
    ).rejects.toThrow('object unavailable');
    expect(called).toBe(false);
    expect(expired.entries()).toHaveLength(1);
    expect(() => expired.enqueue(post)).toThrow('invalid object');
    expired.remove(post.id);
    expect(f.open().entries()).toEqual([]);
  });

  it('aborts a removed pending entry and cannot restore it from a late receipt', async () => {
    const queue = fixture().open();
    const post = object();
    queue.enqueue(post);
    let finish!: (r: Receipt) => void;
    const delivery = queue.deliver(post.id, {
      route: 'nearby',
      put: () =>
        new Promise((r) => {
          finish = r;
        }),
    });
    queue.remove(post.id);
    finish(receipt(post.id));
    await expect(delivery).rejects.toThrow('delivery cancelled');
    expect(queue.entries()).toEqual([]);
  });
});
