import { describe, expect, it } from 'vitest';
import { identityFromSeed } from './keys';
import { sealText } from './box';
import { randomBytes } from './bytes';
import { isSealedObject, openPost, sealPost, sealedObjectId } from './sealed-post';

const identity = identityFromSeed(new Uint8Array(64).fill(7));
const other = identityFromSeed(new Uint8Array(64).fill(8));
const now = 1_800_000_000_000;

describe('sealed Sefirah posts', () => {
  it('keeps author and text inside encryption, with verifiable immutable bytes', () => {
    const key = randomBytes(32);
    const object = sealPost(key, identity.secretKey, 'Meet me at the library', now + 60_000);
    expect(isSealedObject(object)).toBe(true);
    expect(JSON.stringify(object)).not.toContain(identity.did);
    expect(JSON.stringify(object)).not.toContain('library');
    expect(openPost(key, object, identity.did, now)).toEqual({
      author: identity.did,
      text: 'Meet me at the library',
    });
    expect(openPost(randomBytes(32), object, identity.did, now)).toBeNull();
    expect(openPost(key, object, other.did, now)).toBeNull();
    expect(openPost(key, object, identity.did, object.expiresAt)).toBeNull();
  });

  it('rejects modified expiry even when the attacker recomputes the locator', () => {
    const key = randomBytes(32);
    const object = sealPost(key, identity.secretKey, 'Original', now + 60_000);
    const expiresAt = object.expiresAt + 60_000;
    const altered = { ...object, expiresAt, id: sealedObjectId(expiresAt, object.box) };
    expect(isSealedObject(altered)).toBe(true);
    expect(openPost(key, altered, identity.did, now)).toBeNull();
  });

  it('does not accept a forged author even from somebody with the content key', () => {
    const key = randomBytes(32);
    const expiresAt = now + 60_000;
    const box = sealText(
      key,
      'sefirah-post/v1',
      JSON.stringify({
        version: 1,
        author: identity.did,
        text: 'Forged',
        signature: 'AAAA',
      }),
    );
    const object = { version: 1, id: sealedObjectId(expiresAt, box), box, expiresAt };
    expect(isSealedObject(object)).toBe(true);
    expect(openPost(key, object, identity.did, now)).toBeNull();
  });

  it('rejects corrupt and malformed objects without throwing', () => {
    const key = randomBytes(32);
    const object = sealPost(key, identity.secretKey, 'Hello', now + 60_000);
    for (const value of [
      null,
      {},
      { ...object, version: 2 },
      { ...object, box: 'AAAA' },
      { ...object, id: 'A'.repeat(43) },
      { ...object, expiresAt: 0 },
      { ...object, plaintext: 'must not carry extra fields' },
    ]) {
      expect(isSealedObject(value)).toBe(false);
      expect(openPost(key, value, identity.did, now)).toBeNull();
    }
    const box =
      object.box.slice(0, 10) + (object.box[10] === 'A' ? 'B' : 'A') + object.box.slice(11);
    expect(
      openPost(
        key,
        { ...object, box, id: sealedObjectId(object.expiresAt, box) },
        identity.did,
        now,
      ),
    ).toBeNull();
  });

  it('bounds UTF8 payload size and validates expiry', () => {
    const key = randomBytes(32);
    expect(() => sealPost(key, identity.secretKey, '🦋'.repeat(9000), now + 1)).toThrow(
      'post too large',
    );
    expect(() => sealPost(key, identity.secretKey, 'x', NaN)).toThrow('invalid expiry');
    expect(isSealedObject(sealPost(key, identity.secretKey, 'x'.repeat(32 * 1024), now + 1))).toBe(
      true,
    );
  });
});
