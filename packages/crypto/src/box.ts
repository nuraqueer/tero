import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { base64urlnopad } from '@scure/base';
import { randomBytes } from './bytes';

/*
 * A sealed box for private data that is stored on Tero's server but only readable on
 * the member's devices (D7). XChaCha20-Poly1305 with a random nonce; the context string
 * is bound in so a box made for one use can't be passed off as another. The plaintext is
 * padded to a multiple of 1 KiB so the size says little about what's inside.
 */

const nonceLength = 24;
const block = 1024;

function pad(data: Uint8Array): Uint8Array {
  const length = Math.ceil((data.length + 4) / block) * block;
  const out = new Uint8Array(length);
  new DataView(out.buffer).setUint32(0, data.length);
  out.set(data, 4);
  return out;
}

function unpad(data: Uint8Array): Uint8Array | null {
  if (data.length < 4) return null;
  const length = new DataView(data.buffer, data.byteOffset).getUint32(0);
  return length <= data.length - 4 ? data.subarray(4, 4 + length) : null;
}

/** Seals text with a 32-byte key; returns base64url. */
export function sealText(key: Uint8Array, context: string, text: string): string {
  const nonce = randomBytes(nonceLength);
  const sealed = xchacha20poly1305(key, nonce, utf8ToBytes(context)).encrypt(
    pad(utf8ToBytes(text)),
  );
  return base64urlnopad.encode(concatBytes(nonce, sealed));
}

/** Opens a box made by sealText; null if the key, context or box is wrong. */
export function openText(key: Uint8Array, context: string, box: string): string | null {
  try {
    const bytes = base64urlnopad.decode(box);
    const plain = xchacha20poly1305(
      key,
      bytes.subarray(0, nonceLength),
      utf8ToBytes(context),
    ).decrypt(bytes.subarray(nonceLength));
    const data = unpad(plain);
    return data ? new TextDecoder().decode(data) : null;
  } catch {
    return null;
  }
}
