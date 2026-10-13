import { describe, expect, it } from 'vitest';
import { identityFromSeed, randomBytes, signPeerContact, verifyPeerContact } from './index';

const identity = identityFromSeed(randomBytes(64));
const other = identityFromSeed(randomBytes(64));
const now = 1_800_000_000_000;
const contact = () =>
  signPeerContact(identity, `${'a'.repeat(56)}.onion`, 'B'.repeat(43), now, now + 60_000);

describe('private peer contact signatures', () => {
  it('requires an independently pinned owner', () => {
    expect(verifyPeerContact(contact(), identity.did, now)).toBe(true);
    expect(verifyPeerContact(contact(), other.did, now)).toBe(false);
  });
  it('binds onion, capability and lifetime to the owner signature', () => {
    const c = contact();
    for (const altered of [
      { ...c, onion: `${'b'.repeat(56)}.onion` },
      { ...c, capability: 'C'.repeat(43) },
      { ...c, issuedAt: now - 1 },
      { ...c, expiresAt: now + 60_001 },
      { ...c, owner: other.did },
    ])
      expect(verifyPeerContact(altered, altered.owner, now)).toBe(false);
  });
  it('rejects expired, future and oversized lifetime contacts', () => {
    expect(verifyPeerContact(contact(), identity.did, now + 60_000)).toBe(false);
    expect(verifyPeerContact(contact(), identity.did, now - 1)).toBe(false);
    expect(() =>
      signPeerContact(
        identity,
        `${'a'.repeat(56)}.onion`,
        'B'.repeat(43),
        now,
        now + 24 * 60 * 60_000 + 1,
      ),
    ).toThrow();
  });
  it('rejects direct IPs, ordinary hosts, extra fields and malformed values', () => {
    for (const address of [
      '127.0.0.1',
      'example.com',
      `https://${'a'.repeat(56)}.onion`,
      'short.onion',
    ]) {
      expect(() => signPeerContact(identity, address, 'B'.repeat(43), now, now + 60_000)).toThrow();
    }
    expect(verifyPeerContact({ ...contact(), extra: true }, identity.did, now)).toBe(false);
    for (const value of [null, {}, 1, { owner: 1 }])
      expect(verifyPeerContact(value, identity.did, now)).toBe(false);
  });
});
