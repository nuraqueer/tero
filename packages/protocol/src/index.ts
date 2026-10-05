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
  /** The member's tarot card, 0 (the Fool) to 21 (the World). Null for non-members. */
  arcana: number | null;
  /** What the member may do. Null for non-members. */
  role: Role | null;
};

/**
 * Permissions, kept apart from the card people see. Only the Fool and the council use
 * Tero on the web; everyone else, moderators included, uses the phone app (D40).
 */
export type Role = 'fool' | 'council' | 'member';

export const webRoles: readonly Role[] = ['fool', 'council'];

/** Council members join at Sequence 1. */
export const councilSequence = 1;

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
  | 'not_allowed'
  | 'conflict'
  | 'rate_limited';

/** How Tero is doing, for the Fool and the council only. Counts, never who. */
export type StatusResponse = {
  members: number;
  council: number;
  openCards: number;
  /** Server time, to show the check is fresh. */
  checkedAt: number;
};

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

/** Member cards land as Sequence 9; council cards (the Fool's only) seat a council member. */
export type CardType = 'member' | 'council';

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
  /** The tarot card the newcomer will take, drawn when the card is made. */
  arcana: number;
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

// The 22 Major Arcana. Each member holds one; 0 is the Fool's alone.

export const arcanaCount = 22;
export const foolArcana = 0;

/**
 * Draws the tarot card a newcomer will take: never the Fool, and never the giver's own
 * card, nor any in taken (council seats have one holder each). random returns [0, 1).
 */
export function drawArcana(
  giver: number | null,
  random: () => number,
  taken: readonly number[] = [],
): number {
  const choices: number[] = [];
  for (let n = 1; n < arcanaCount; n++) if (n !== giver && !taken.includes(n)) choices.push(n);
  if (choices.length === 0) throw new Error('no arcana left to draw');
  return choices[Math.floor(random() * choices.length)]!;
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
  return (
    !!v && isCardId(v.id) && isCardToken(v.nonce) && (v.type === 'member' || v.type === 'council')
  );
}

export function isClaimCardRequest(value: unknown): value is ClaimCardRequest {
  const v = asObject(value);
  return !!v && isCardToken(v.token) && v.adult === true;
}

export function isApproveCardRequest(value: unknown): value is ApproveCardRequest {
  const v = asObject(value);
  return !!v && isShortString(v.claimer, 128) && v.adult === true;
}

// The directory: places members trust, per part of Help (clinics, lawyers, shelters…).

/** The parts of Help that are directories of places. */
export const directoryParts = [
  'mentalHealth',
  'safeSpaces',
  'legal',
  'travel',
  'providers',
  'affirming',
  'generalHealth',
] as const;
export type DirectoryPart = (typeof directoryParts)[number];

export const placeCosts = ['free', 'low', 'paid', 'unknown'] as const;
export type PlaceCost = (typeof placeCosts)[number];

/** Limits on what a member writes about a place. */
export const placeLimits = { name: 80, city: 60, offers: 400, contact: 160 } as const;

/** How many places one member may add in a day. */
export const placesPerDay = 10;

export type NewPlace = {
  part: DirectoryPart;
  name: string;
  /** ISO 3166-1 alpha-2, upper case. */
  country: string;
  /** City or area. Never a street address of a member. */
  city: string;
  /** What they offer and what to expect. */
  offers: string;
  /** Website, phone or how to reach them. Optional. */
  contact: string;
  cost: PlaceCost;
  /** Sees people from other countries. */
  international: boolean;
  /** Doesn't know Tero: members must not show their Tero card there (D36). */
  unaware: boolean;
};

export type Place = NewPlace & {
  id: string;
  /** Members who said "I've been, it went well". */
  vouches: number;
  /** A Tero partner checked by the council. Members can't set this. */
  verified: boolean;
  /** Day it was added (midnight UTC), not the exact time. */
  addedOn: number;
  /** Added by the person asking. */
  mine: boolean;
  /** The person asking has vouched for it. */
  vouched: boolean;
};

export type PlaceListResponse = { places: Place[] };

const placeIdPattern = /^[A-Za-z0-9_-]{16}$/;
export const isPlaceId = (value: unknown): value is string =>
  typeof value === 'string' && placeIdPattern.test(value);

const isText = (value: unknown, max: number, required = true): value is string =>
  typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);

export const isDirectoryPart = (value: unknown): value is DirectoryPart =>
  (directoryParts as readonly unknown[]).includes(value);

export function isNewPlace(value: unknown): value is NewPlace {
  const v = asObject(value);
  return (
    !!v &&
    isDirectoryPart(v.part) &&
    isText(v.name, placeLimits.name) &&
    typeof v.country === 'string' &&
    /^[A-Z]{2}$/.test(v.country) &&
    isText(v.city, placeLimits.city) &&
    isText(v.offers, placeLimits.offers) &&
    isText(v.contact, placeLimits.contact, false) &&
    (placeCosts as readonly unknown[]).includes(v.cost) &&
    typeof v.international === 'boolean' &&
    typeof v.unaware === 'boolean'
  );
}
