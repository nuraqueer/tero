import { describe, expect, it } from 'vitest';
import { identityFromSeed } from './keys';
import { randomBytes } from './bytes';
import {
  directoryId,
  grantDirectoryKey,
  normalizeHandle,
  openDirectoryKey,
  openMemberProfile,
  sealMemberProfile,
  verifyProfileEnvelope,
} from './directory';
const alice = identityFromSeed(new Uint8Array(64).fill(1));
const bob = identityFromSeed(new Uint8Array(64).fill(2));
const outsider = identityFromSeed(new Uint8Array(64).fill(3));

describe('encrypted member directory', () => {
  it('wraps a key for its recipient, rejects other identities and altered grants', () => {
    const key = randomBytes(32);
    const grant = grantDirectoryKey(alice, bob.did, key);
    expect(openDirectoryKey(bob, grant, directoryId(key))).toEqual(key);
    expect(openDirectoryKey(outsider, grant, directoryId(key))).toBeNull();
    expect(openDirectoryKey(bob, { ...grant, sender: outsider.did }, directoryId(key))).toBeNull();
    expect(openDirectoryKey(bob, grant, directoryId(randomBytes(32)))).toBeNull();
    expect(
      openDirectoryKey(bob, { ...grant, box: grant.box.slice(1) }, directoryId(key)),
    ).toBeNull();
  });
  it('signs encrypted profiles and binds owner, revision and permanent handle', () => {
    const key = randomBytes(32);
    const profile = { handle: 'la-niina', displayName: 'La niina' };
    const envelope = sealMemberProfile(alice, key, profile, 1);
    expect(JSON.stringify(envelope)).not.toContain('la-niina');
    expect(JSON.stringify(envelope)).not.toContain('La niina');
    expect(openMemberProfile(key, envelope, alice.did)).toEqual(profile);
    expect(openMemberProfile(key, envelope, bob.did)).toBeNull();
    expect(openMemberProfile(randomBytes(32), envelope, alice.did)).toBeNull();
    expect(verifyProfileEnvelope({ ...envelope, revision: 2 })).toBe(false);
    expect(verifyProfileEnvelope({ ...envelope, handleTag: directoryId(key) })).toBe(false);
  });
  it('normalizes ASCII handles and rejects ambiguous input', () => {
    expect(normalizeHandle(' @La-Niina ')).toBe('la-niina');
    expect(normalizeHandle('la_niina')).toBe('la_niina');
    for (const value of [
      'ab',
      'a.b',
      'éclair',
      '123abc',
      'la niina',
      '@@la-niina',
      'la/niina',
      'a'.repeat(25),
    ])
      expect(normalizeHandle(value)).toBeNull();
  });
});
