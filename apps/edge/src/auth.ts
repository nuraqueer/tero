import {
  base64UrlToBytes,
  bytesToBase64Url,
  publicKeyFromDid,
  randomBytes,
  verify,
} from '@tero/crypto';
import { challengeTtlMs, sessionTtlMs, signInMessage, type SignInRequest } from '@tero/protocol';

/*
 * Challenges and session tokens are signed with a server secret (HMAC-SHA256), so the
 * Worker checks them without storing anything:
 *
 *   challenge  c1.<random>.<expiresAt>.<mac>
 *   session    s1.<did>.<expiresAt>.<mac>
 *
 * A challenge can be used more than once before it expires, but only by someone who
 * can sign it with an identity key, and it only ever yields a session for that key.
 */

const encoder = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function mac(secret: string, body: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body));
  return bytesToBase64Url(new Uint8Array(signature));
}

/** Checks the mac in constant time and returns the body's parts, or null. */
async function open(secret: string, value: string, kind: 'c1' | 's1'): Promise<string[] | null> {
  const parts = value.split('.');
  if (parts.length !== 4 || parts[0] !== kind) return null;
  const signature = base64UrlToBytes(parts[3]!);
  if (!signature) return null;
  const body = parts.slice(0, 3).join('.');
  const ok = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret),
    signature,
    encoder.encode(body),
  );
  return ok ? parts.slice(1, 3) : null;
}

function expiry(text: string, now: number): number | null {
  const expiresAt = Number(text);
  return Number.isSafeInteger(expiresAt) && expiresAt > now ? expiresAt : null;
}

export async function createChallenge(secret: string, now = Date.now()) {
  const expiresAt = now + challengeTtlMs;
  const body = `c1.${bytesToBase64Url(randomBytes(24))}.${expiresAt}`;
  return { challenge: `${body}.${await mac(secret, body)}`, expiresAt };
}

export type SignInResult =
  | { ok: true; token: string; expiresAt: number }
  | { ok: false; error: 'invalid_signature' | 'expired' };

export async function signIn(
  secret: string,
  request: SignInRequest,
  now = Date.now(),
): Promise<SignInResult> {
  const parts = await open(secret, request.challenge, 'c1');
  if (!parts) return { ok: false, error: 'invalid_signature' };
  if (expiry(parts[1]!, now) === null) return { ok: false, error: 'expired' };

  const publicKey = publicKeyFromDid(request.did);
  const signature = base64UrlToBytes(request.signature);
  if (!publicKey || !signature || !verify(signature, signInMessage(request.challenge), publicKey)) {
    return { ok: false, error: 'invalid_signature' };
  }

  const expiresAt = now + sessionTtlMs;
  const body = `s1.${request.did}.${expiresAt}`;
  return { ok: true, token: `${body}.${await mac(secret, body)}`, expiresAt };
}

/** Returns the did:key a session token belongs to, or null if it is invalid or expired. */
export async function sessionDid(
  secret: string,
  token: string,
  now = Date.now(),
): Promise<string | null> {
  const parts = await open(secret, token, 's1');
  if (!parts || expiry(parts[1]!, now) === null) return null;
  return parts[0]!;
}
