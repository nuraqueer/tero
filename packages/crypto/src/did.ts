import { base58 } from '@scure/base';

// did:key for Ed25519: "z" (base58btc) + multicodec 0xed 0x01 + the 32-byte public key.
// https://w3c-ccg.github.io/did-key-spec/
const prefix = 'did:key:z';
const ed25519Codec = [0xed, 0x01] as const;

export function didFromPublicKey(publicKey: Uint8Array): string {
  if (publicKey.length !== 32) throw new Error('Ed25519 public keys are 32 bytes');
  const bytes = new Uint8Array(34);
  bytes.set(ed25519Codec, 0);
  bytes.set(publicKey, 2);
  return prefix + base58.encode(bytes);
}

/** Returns the Ed25519 public key in a did:key, or null if it isn't one. */
export function publicKeyFromDid(did: string): Uint8Array | null {
  if (!did.startsWith(prefix)) return null;
  let bytes: Uint8Array;
  try {
    bytes = base58.decode(did.slice(prefix.length));
  } catch {
    return null;
  }
  if (bytes.length !== 34 || bytes[0] !== ed25519Codec[0] || bytes[1] !== ed25519Codec[1]) {
    return null;
  }
  return bytes.slice(2);
}
