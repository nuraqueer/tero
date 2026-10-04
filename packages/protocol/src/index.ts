/*
 * Shapes shared by the app and the edge Worker.
 *
 * Signing in: the app asks for a challenge, signs the sign-in message for it with the
 * identity key, and sends back its did:key with the signature. Nothing secret is sent.
 */

/** How long a challenge can be used. */
export const challengeTtlMs = 2 * 60 * 1000;

/** How long a session lasts before the app signs in again. */
export const sessionTtlMs = 12 * 60 * 60 * 1000;

/** The exact bytes the identity key signs. The prefix stops a sign-in signature being reused for anything else. */
export function signInMessage(challenge: string): Uint8Array {
  return new TextEncoder().encode(`tero-sign-in/v1\n${challenge}`);
}

export type ChallengeResponse = { challenge: string; expiresAt: number };

export type SignInRequest = {
  did: string;
  challenge: string;
  /** Ed25519 signature of signInMessage(challenge), base64url without padding. */
  signature: string;
};

export type SignInResponse = { token: string; expiresAt: number };

export type MeResponse = { did: string };

export type ApiErrorCode =
  | 'bad_request'
  | 'invalid_signature'
  | 'expired'
  | 'unauthorized'
  | 'not_found'
  | 'method_not_allowed'
  | 'not_configured';

export type ApiError = { error: ApiErrorCode };

const isShortString = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max;

export function isSignInRequest(value: unknown): value is SignInRequest {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isShortString(v.did, 128) && isShortString(v.challenge, 256) && isShortString(v.signature, 128)
  );
}
