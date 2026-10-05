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

export type MeResponse = {
  did: string;
  member: boolean;
  /** The trust level, 0 (the Fool) to 9 (new members). Null for non-members. */
  sequence: number | null;
};

export type ApiErrorCode =
  | 'founder_taken'
  | 'bad_request'
  | 'invalid_signature'
  | 'expired'
  | 'unauthorized'
  | 'not_found'
  | 'method_not_allowed'
  | 'not_configured'
  | 'not_member'
  | 'already_member'
  | 'card_unavailable'
  | 'card_limit'
  | 'conflict';

/** Whether the Fool's seat is still open: true only until the first member exists. */
export type FounderSeatResponse = { open: boolean };

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

// Tero cards (invites). See docs/roles-and-sequences.md#tero-cards-invites.

/** An unclaimed card expires after this long. */
export const cardTtlMs = 7 * 24 * 60 * 60 * 1000;

/** Once claimed, the inviter has this long to approve. */
export const claimedCardTtlMs = 24 * 60 * 60 * 1000;

/** Professional and council cards come later. */
export type CardType = 'member';

export type CardSummary = {
  /** base64url of the hash of the card's token. */
  id: string;
  /** base64url; the inviter's phone makes the token from it. */
  nonce: string;
  type: CardType;
  state: 'open' | 'claimed';
  expiresAt: number;
  /** The did:key that claimed the card, once claimed. */
  claimer: string | null;
};

export type CreateCardRequest = { id: string; nonce: string; type: CardType };
export type CardListResponse = { cards: CardSummary[] };

/** The newcomer declares they are an adult where they live. */
export type ClaimCardRequest = { token: string; adult: true };
export type ClaimCardResponse = { id: string; expiresAt: number };

/** The inviter confirms who they approve, and that the person is of legal age. */
export type ApproveCardRequest = { claimer: string; adult: true };

/**
 * How many unclaimed or unapproved cards someone can have at once, by Sequence.
 * A proposal for the council to settle.
 */
export function openCardLimit(sequence: number): number {
  if (sequence <= 0) return 50;
  if (sequence <= 3) return 10;
  if (sequence <= 6) return 5;
  if (sequence <= 8) return 3;
  return 1;
}

/** The link in a card's QR code. */
export function cardUrl(origin: string, token: string): string {
  return `${origin}/c/${token}`;
}

const tokenPattern = /^[A-Za-z0-9_-]{22}$/;
const idPattern = /^[A-Za-z0-9_-]{43}$/;

export const isCardToken = (value: unknown): boolean =>
  typeof value === 'string' && tokenPattern.test(value);

export const isCardId = (value: unknown): boolean =>
  typeof value === 'string' && idPattern.test(value);

/** Finds the token in a scanned or pasted card link, or a bare token. */
export function tokenFromCardLink(text: string): string | null {
  const trimmed = text.trim();
  if (isCardToken(trimmed)) return trimmed;
  const match = trimmed.match(/\/c\/([A-Za-z0-9_-]{22})\/?(?:[?#].*)?$/);
  return match ? match[1]! : null;
}

const asObject = (value: unknown) =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

export function isCreateCardRequest(value: unknown): value is CreateCardRequest {
  const v = asObject(value);
  return !!v && isCardId(v.id) && isCardToken(v.nonce) && v.type === 'member';
}

export function isClaimCardRequest(value: unknown): value is ClaimCardRequest {
  const v = asObject(value);
  return !!v && isCardToken(v.token) && v.adult === true;
}

export function isApproveCardRequest(value: unknown): value is ApproveCardRequest {
  const v = asObject(value);
  return !!v && isShortString(v.claimer, 128) && v.adult === true;
}
