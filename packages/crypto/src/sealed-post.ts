import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { openText, sealText } from './box';
import { base64UrlToBytes, bytesToBase64Url } from './bytes';
import { didFromPublicKey, publicKeyFromDid } from './did';
import { sign, verify } from './sign';

/** Development object format. Not a membership credential or a key exchange protocol. */
export type SealedObject = { version: 1; id: string; expiresAt: number; box: string };
export type VerifiedPost = { author: string; text: string };

export const sealedObjectBoxLimit = 64 * 1024;
const context = 'sefirah-post/v1';
const idPattern = /^[A-Za-z0-9_-]{43}$/;

export const isSealedObjectId = (value: unknown): value is string =>
  typeof value === 'string' && idPattern.test(value);

/** Exact fixed-array encoding, shared by signing and verification. */
function message(author: string, expiresAt: number, text: string): Uint8Array {
  return utf8ToBytes(JSON.stringify([context, author, expiresAt, text]));
}

export function sealedObjectId(expiresAt: number, box: string): string {
  return bytesToBase64Url(
    sha256(utf8ToBytes(JSON.stringify(['sefirah-object/v1', expiresAt, box]))),
  );
}

/** Checks the wire shape and hash, not whether the sender actually encrypted the bytes. */
export function isSealedObject(value: unknown): value is SealedObject {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).length !== 4 ||
    v.version !== 1 ||
    !isSealedObjectId(v.id) ||
    !Number.isSafeInteger(v.expiresAt) ||
    (v.expiresAt as number) <= 0 ||
    typeof v.box !== 'string' ||
    v.box.length > sealedObjectBoxLimit ||
    !/^[A-Za-z0-9_-]+$/.test(v.box)
  ) {
    return false;
  }
  const bytes = base64UrlToBytes(v.box);
  // Existing sealText: 24-byte nonce, a multiple of 1024 padded bytes, 16-byte tag.
  if (
    !bytes ||
    bytes.length < 1064 ||
    (bytes.length - 40) % 1024 !== 0 ||
    bytesToBase64Url(bytes) !== v.box
  ) {
    return false;
  }
  return v.id === sealedObjectId(v.expiresAt as number, v.box);
}

/** The caller supplies a content key shared only with authorised recipients. */
export function sealPost(
  contentKey: Uint8Array,
  signingSecret: Uint8Array,
  text: string,
  expiresAt: number,
): SealedObject {
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= 0) throw new Error('invalid expiry');
  if (utf8ToBytes(text).length > 32 * 1024) throw new Error('post too large');
  const author = didFromPublicKey(ed25519.getPublicKey(signingSecret));
  const signature = bytesToBase64Url(sign(message(author, expiresAt, text), signingSecret));
  const box = sealText(
    contentKey,
    context,
    JSON.stringify({ version: 1, author, text, signature }),
  );
  return { version: 1, id: sealedObjectId(expiresAt, box), expiresAt, box };
}

/** Expected author comes from trusted application context, not a carrier assertion. */
export function openPost(
  contentKey: Uint8Array,
  object: unknown,
  expectedAuthor: string,
  now: number,
): VerifiedPost | null {
  if (!Number.isSafeInteger(now) || !isSealedObject(object) || object.expiresAt <= now) return null;
  const text = openText(contentKey, context, object.box);
  if (text === null) return null;
  try {
    const post: unknown = JSON.parse(text);
    if (!post || typeof post !== 'object') return null;
    const v = post as Record<string, unknown>;
    if (
      Object.keys(v).length !== 4 ||
      v.version !== 1 ||
      v.author !== expectedAuthor ||
      typeof v.author !== 'string' ||
      typeof v.text !== 'string' ||
      utf8ToBytes(v.text).length > 32 * 1024 ||
      typeof v.signature !== 'string'
    ) {
      return null;
    }
    const publicKey = publicKeyFromDid(v.author);
    const signature = base64UrlToBytes(v.signature);
    if (
      !publicKey ||
      !signature ||
      !verify(signature, message(v.author, object.expiresAt, v.text), publicKey)
    ) {
      return null;
    }
    return { author: v.author, text: v.text };
  } catch {
    return null;
  }
}
