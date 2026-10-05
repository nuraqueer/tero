import { ed25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { generateMnemonic, mnemonicToSeed, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { didFromPublicKey } from './did';

/** Makes a new recovery phrase of 12 words (128 bits of randomness). */
export function createPhrase(): string {
  return generateMnemonic(wordlist, 128);
}

/** Lower-cases a typed phrase and collapses spaces, so "Apple  Banana" matches "apple banana". */
export function normalizePhrase(input: string): string {
  return input.trim().toLowerCase().split(/\s+/).join(' ');
}

const words = new Set(wordlist);

/** True if this is one of the 2048 words a recovery phrase can contain. */
export function isPhraseWord(word: string): boolean {
  return words.has(word.trim().toLowerCase());
}

/**
 * The full word, once a typed start can only be one phrase word (every word is
 * identified by its first four letters, often fewer). Null while it could be several.
 * Starts shorter than three letters never complete, so typing feels predictable.
 */
export function completePhraseWord(start: string): string | null {
  const typed = start.trim().toLowerCase();
  if (typed.length < 3) return null;
  let match: string | null = null;
  for (const word of wordlist) {
    if (!word.startsWith(typed)) continue;
    if (match !== null) return null;
    match = word;
  }
  return match;
}

/**
 * Reads 12 words out of whatever was pasted: "1 onion 2 tomato …", "1. onion" on
 * separate lines, commas, or just the words in order. When numbers are given, each word
 * goes to its number's place; otherwise the words are taken in order. Returns 12 slots,
 * empty where nothing was found.
 */
export function arrangePhraseWords(text: string, count = 12): string[] {
  const slots: string[] = Array(count).fill('');
  const tokens = text.toLowerCase().match(/\d+|[a-z]+/g) ?? [];
  const numbered = tokens.some((token) => /^\d+$/.test(token));
  let next = 0;
  let place: number | null = null;
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      const n = Number(token);
      place = n >= 1 && n <= count ? n - 1 : null;
      continue;
    }
    if (numbered) {
      if (place !== null) slots[place] = token;
      place = null;
    } else if (next < count) {
      slots[next++] = token;
    }
  }
  return slots;
}

/**
 * The text of a saved recovery file: one numbered word per line ("1. onion"), so the
 * whole file pastes straight into restore. The note has no digits, which
 * arrangePhraseWords would read as word numbers.
 */
export function phraseFileText(phrase: string): string {
  const lines = normalizePhrase(phrase)
    .split(' ')
    .map((word, i) => `${i + 1}. ${word}`);
  return [
    'Tero recovery words',
    '',
    ...lines,
    '',
    'Anyone with these words can take your Tero account.',
    'Keep this file off shared or cloud-synced storage, or print it and delete it.',
    '',
  ].join('\n');
}

export function isValidPhrase(phrase: string): boolean {
  return validateMnemonic(normalizePhrase(phrase), wordlist);
}

/** The 64-byte seed every key comes from. */
export async function phraseToSeed(phrase: string): Promise<Uint8Array> {
  const normalized = normalizePhrase(phrase);
  if (!validateMnemonic(normalized, wordlist)) throw new Error('invalid recovery phrase');
  return mnemonicToSeed(normalized);
}

/**
 * What a key is for. Each purpose gets its own key, and nobody can tell from the
 * public keys that they come from the same seed. Wallet keys will use the standard
 * BIP-32 paths for Celo instead, so other wallets can restore them.
 */
export type KeyPurpose = 'identity' | 'messaging' | 'cards' | 'app';

const derivationSalt = utf8ToBytes('tero/key-derivation/v1');

/** Derives a 32-byte secret for one purpose; index separates keys of the same purpose. */
export function deriveSecret(seed: Uint8Array, purpose: KeyPurpose, index = 0): Uint8Array {
  if (!Number.isInteger(index) || index < 0) throw new Error('index must be a whole number');
  return hkdf(sha256, seed, derivationSalt, utf8ToBytes(`${purpose}/${index}`), 32);
}

export type Identity = {
  secretKey: Uint8Array;
  publicKey: Uint8Array;
  /** The Tero address others see and verify, as a did:key. */
  did: string;
};

export function identityFromSeed(seed: Uint8Array): Identity {
  const secretKey = deriveSecret(seed, 'identity');
  const publicKey = ed25519.getPublicKey(secretKey);
  return { secretKey, publicKey, did: didFromPublicKey(publicKey) };
}
