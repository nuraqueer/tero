import { randomBytes } from '@noble/hashes/utils.js';
import { base64urlnopad } from '@scure/base';

export { randomBytes };

export function bytesToBase64Url(bytes: Uint8Array): string {
  return base64urlnopad.encode(bytes);
}

/** Returns null for anything that isn't valid unpadded base64url. */
export function base64UrlToBytes(text: string): Uint8Array | null {
  try {
    return base64urlnopad.decode(text);
  } catch {
    return null;
  }
}
