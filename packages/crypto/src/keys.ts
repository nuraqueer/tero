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
export type KeyPurpose = 'identity' | 'messaging' | 'app';

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
