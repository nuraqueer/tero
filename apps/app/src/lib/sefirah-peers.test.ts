import { describe, expect, it } from 'vitest';
import { identityFromSeed, randomBytes, signPeerContact } from '@tero/crypto';
import { SefirahPeers } from './sefirah-peers';

const now = 1_800_000_000_000;
const owner = identityFromSeed(randomBytes(64));
const contact = (at = now) =>
  signPeerContact(owner, `${'a'.repeat(56)}.onion`, 'B'.repeat(43), at, at + 60_000);
function fixture() {
  const slots: (string | null)[] = [null, null];
  const key = randomBytes(32);
  const storage = {
    read: (s: 0 | 1) => slots[s],
    write: (s: 0 | 1, box: string) => {
      slots[s] = box;
    },
  };
  return { slots, storage, key, open: () => new SefirahPeers(storage, key) };
}

describe('encrypted pinned peer directory', () => {
  it('persists contacts encrypted and reopens without exposing the owner or capability', () => {
    const f = fixture();
    const peers = f.open();
    peers.add(contact(), owner.did, now);
    peers.close();
    expect(f.slots[1]).not.toContain(owner.did);
    expect(f.slots[1]).not.toContain(contact().capability);
    expect(f.open().find(owner.did, now)).toEqual(contact());
  });
  it('rejects an unpinned owner and modified contact', () => {
    const peers = fixture().open();
    expect(() => peers.add(contact(), 'untrusted', now)).toThrow('untrusted peer');
    expect(() => peers.add({ ...contact(), capability: 'C'.repeat(43) }, owner.did, now)).toThrow(
      'untrusted peer',
    );
    expect(peers.list()).toEqual([]);
  });
  it('allows identical retries and newer contacts, but blocks stale replacements', () => {
    const peers = fixture().open();
    peers.add(contact(), owner.did, now);
    peers.add(contact(), owner.did, now);
    peers.add(contact(now + 1), owner.did, now + 1);
    expect(() => peers.add(contact(), owner.did, now + 2)).toThrow('stale peer');
    expect(peers.list()).toEqual([contact(now + 1)]);
    peers.list()[0].owner = 'changed';
    expect(peers.find(owner.did, now + 2)?.owner).toBe(owner.did);
  });
  it('retains expired records for explicit removal but cannot connect with them', () => {
    const f = fixture();
    f.open().add(contact(), owner.did, now);
    const peers = f.open();
    expect(peers.find(owner.did, now + 60_000)).toBe(null);
    expect(peers.list()).toHaveLength(1);
    peers.remove(owner.did);
    expect(f.open().list()).toEqual([]);
  });
  it('fails closed for a wrong key and recovers a previous authenticated snapshot after a torn write', () => {
    const f = fixture();
    const peers = f.open();
    peers.add(contact(), owner.did, now);
    expect(() => new SefirahPeers(f.storage, randomBytes(32))).toThrow('unreadable');
    f.storage.write = (s, box) => {
      f.slots[s] = box.slice(0, 30);
      throw new Error('interrupted');
    };
    expect(() => peers.add(contact(now + 1), owner.did, now + 1)).toThrow('interrupted');
    const restored = f.open();
    expect(restored.recovered).toBe(true);
    expect(restored.list()).toEqual([contact()]);
    restored.close();
    expect(() => restored.list()).toThrow('closed');
  });
  it('rejects new contacts at capacity without evicting existing pins', () => {
    const peers = fixture().open();
    for (let n = 0; n < 32; n++) {
      const member = identityFromSeed(randomBytes(64));
      peers.add(
        signPeerContact(member, `${'a'.repeat(56)}.onion`, 'B'.repeat(43), now, now + 60_000),
        member.did,
        now,
      );
    }
    expect(() => peers.add(contact(), owner.did, now)).toThrow('full');
    expect(peers.list()).toHaveLength(32);
  });
});
