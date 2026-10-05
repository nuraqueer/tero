import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { base64urlnopad } from '@scure/base';

/*
 * Tero cards (invites).
 *
 * The token in a card's QR code comes from the inviter's card secret and a random
 * nonce, so the inviter can show the same card again after the app locks. The server
 * stores only the nonce and the card id (a hash of the token): it can't make the QR,
 * and a copy of its database can't claim cards.
 *
 * The in-person code comes from the card id and the key that claimed the card. Both
 * phones work it out on their own; if they match, the person standing in front of the
 * inviter is the one who claimed the card.
 */

export const cardNonceLength = 16;
const tokenLength = 16;

export function cardToken(cardSecret: Uint8Array, nonce: Uint8Array): string {
  if (nonce.length !== cardNonceLength) throw new Error('card nonces are 16 bytes');
  const mac = hmac(sha256, cardSecret, concatBytes(utf8ToBytes('tero-card-token/v1'), nonce));
  return base64urlnopad.encode(mac.subarray(0, tokenLength));
}

export function cardIdFromToken(token: string): string {
  return base64urlnopad.encode(sha256(utf8ToBytes(`tero-card-id/v1\n${token}`)));
}

/** Six digits, the same on both phones only for the same card and the same claiming key. */
export function cardCode(cardId: string, claimerDid: string): string {
  const hash = sha256(utf8ToBytes(`tero-card-code/v1\n${cardId}\n${claimerDid}`));
  const value = ((hash[0]! << 24) | (hash[1]! << 16) | (hash[2]! << 8) | hash[3]!) >>> 0;
  return String(value % 1_000_000).padStart(6, '0');
}
