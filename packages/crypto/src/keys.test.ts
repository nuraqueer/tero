import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';
import {
  arrangePhraseWords,
  completePhraseWord,
  createPhrase,
  deriveSecret,
  didFromPublicKey,
  identityFromSeed,
  isPhraseWord,
  isValidPhrase,
  normalizePhrase,
  phraseFileText,
  phraseToSeed,
  publicKeyFromDid,
  sign,
  verify,
} from './index';

const testPhrase =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('recovery phrase', () => {
  it('has 12 valid words', () => {
    const phrase = createPhrase();
    expect(phrase.split(' ')).toHaveLength(12);
    expect(isValidPhrase(phrase)).toBe(true);
  });

  it('is different every time', () => {
    expect(createPhrase()).not.toBe(createPhrase());
  });

  it('accepts messy typing but rejects a wrong checksum', () => {
    expect(normalizePhrase('  Abandon   ABOUT ')).toBe('abandon about');
    expect(isValidPhrase(testPhrase.toUpperCase())).toBe(true);
    expect(isValidPhrase(testPhrase.replace(/about$/, 'abandon'))).toBe(false);
  });

  it('turns into the standard BIP-39 seed', async () => {
    const seed = await phraseToSeed(testPhrase);
    expect(bytesToHex(seed)).toBe(
      '5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc1' +
        '9a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4',
    );
  });

  it('refuses an invalid phrase', async () => {
    await expect(phraseToSeed('not a phrase')).rejects.toThrow();
  });
});

describe('derived keys', () => {
  it('are the same from the same seed', async () => {
    const seed = await phraseToSeed(testPhrase);
    expect(identityFromSeed(seed).did).toBe(identityFromSeed(seed).did);
  });

  it('are separate for each purpose and index', async () => {
    const seed = await phraseToSeed(testPhrase);
    const secrets = [
      deriveSecret(seed, 'identity'),
      deriveSecret(seed, 'messaging'),
      deriveSecret(seed, 'app', 0),
      deriveSecret(seed, 'app', 1),
    ].map(bytesToHex);
    expect(new Set(secrets).size).toBe(secrets.length);
  });

  it('rejects a negative index', async () => {
    const seed = await phraseToSeed(testPhrase);
    expect(() => deriveSecret(seed, 'app', -1)).toThrow();
  });
});

describe('did:key', () => {
  // RFC 8032, section 7.1, test 1.
  const publicKey = hexToBytes('d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a');

  it('round-trips an Ed25519 public key', () => {
    const did = didFromPublicKey(publicKey);
    expect(did.startsWith('did:key:z6Mk')).toBe(true);
    expect(publicKeyFromDid(did)).toEqual(publicKey);
  });

  it('rejects anything else', () => {
    expect(publicKeyFromDid('did:web:example.org')).toBeNull();
    expect(publicKeyFromDid('did:key:z0OIl')).toBeNull();
    expect(publicKeyFromDid('did:key:z6Mk')).toBeNull();
  });
});

describe('signatures', () => {
  it('match RFC 8032 test 1', () => {
    const secretKey = hexToBytes(
      '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60',
    );
    const signature = sign(new Uint8Array(), secretKey);
    expect(bytesToHex(signature)).toBe(
      'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155' +
        '5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b',
    );
  });

  it('verify only for the right key and message', async () => {
    const identity = identityFromSeed(await phraseToSeed(testPhrase));
    const other = identityFromSeed(await phraseToSeed(createPhrase()));
    const message = new TextEncoder().encode('hello');
    const signature = sign(message, identity.secretKey);
    expect(verify(signature, message, identity.publicKey)).toBe(true);
    expect(verify(signature, message, other.publicKey)).toBe(false);
    expect(verify(signature, new TextEncoder().encode('hellp'), identity.publicKey)).toBe(false);
    expect(verify(new Uint8Array(3), message, identity.publicKey)).toBe(false);
  });
});

describe('isPhraseWord', () => {
  it('knows the phrase words, ignoring case and spaces', () => {
    expect(isPhraseWord('abandon')).toBe(true);
    expect(isPhraseWord(' Zoo ')).toBe(true);
    expect(isPhraseWord('tero')).toBe(false);
  });
});

describe('completePhraseWord', () => {
  it('fills in a word once the start can only be one word', () => {
    expect(completePhraseWord('aban')).toBe('abandon');
    expect(completePhraseWord('ZOO')).toBe('zoo');
  });

  it('waits while the start fits several words or none', () => {
    expect(completePhraseWord('act')).toBeNull();
    expect(completePhraseWord('ab')).toBeNull();
    expect(completePhraseWord('qqq')).toBeNull();
  });
});

describe('arrangePhraseWords', () => {
  const twelve = 'onion tomato river lantern quiet morning zoo act fish abandon wolf kettle';
  const words = twelve.split(' ');

  it('takes plain words in order', () => {
    expect(arrangePhraseWords(twelve)).toEqual(words);
  });

  it('places numbered words by their numbers, in any layout', () => {
    const shuffled = words
      .map((w, i) => `${i + 1}. ${w.toUpperCase()}`)
      .reverse()
      .join('\n');
    expect(arrangePhraseWords(shuffled)).toEqual(words);
    expect(arrangePhraseWords(words.map((w, i) => `${i + 1} ${w}`).join(' '))).toEqual(words);
    expect(arrangePhraseWords(words.map((w, i) => `${i + 1}) ${w},`).join(''))).toEqual(words);
  });

  it('leaves gaps where words are missing', () => {
    expect(arrangePhraseWords('1 onion 3 river').slice(0, 3)).toEqual(['onion', '', 'river']);
  });
});

describe('phraseFileText', () => {
  it('numbers each word on its own line and reads back with arrangePhraseWords', () => {
    const phrase = createPhrase();
    const text = phraseFileText(phrase);
    expect(text).toContain(`1. ${phrase.split(' ')[0]}\n`);
    expect(arrangePhraseWords(text).join(' ')).toBe(phrase);
  });

  it('keeps digits out of the note', () => {
    const notes = phraseFileText(testPhrase)
      .split('\n')
      .filter((line) => !/^\d+\. [a-z]+$/.test(line));
    expect(notes.join(' ')).not.toMatch(/\d/);
  });
});
