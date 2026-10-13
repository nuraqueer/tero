import { bytesToBase64Url, base64UrlToBytes } from './bytes';
import { publicKeyFromDid } from './did';
import { sign, verify } from './sign';
import type { Identity } from './keys';

/** Private contact capability. Share only with intended peers, never in a public DHT. */
export type PeerContact = {
  version: 1;
  owner: string;
  onion: string;
  capability: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
};
const onionPattern = /^[a-z2-7]{56}\.onion$/;
const capabilityPattern = /^[A-Za-z0-9_-]{43}$/;
function message(c: Omit<PeerContact, 'signature'>): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify([
      'sefirah-peer-contact/v1',
      c.owner,
      c.onion,
      c.capability,
      c.issuedAt,
      c.expiresAt,
    ]),
  );
}
export function signPeerContact(
  identity: Identity,
  onion: string,
  capability: string,
  issuedAt: number,
  expiresAt: number,
): PeerContact {
  const contact: Omit<PeerContact, 'signature'> = {
    version: 1,
    owner: identity.did,
    onion,
    capability,
    issuedAt,
    expiresAt,
  };
  const signed = {
    ...contact,
    signature: bytesToBase64Url(sign(message(contact), identity.secretKey)),
  };
  if (!verifyPeerContact(signed, identity.did, issuedAt)) throw new Error('invalid peer contact');
  return signed;
}
/** expectedOwner must come from an existing trusted invitation or contact, not this record. */
export function verifyPeerContact(
  value: unknown,
  expectedOwner: string,
  now: number,
): value is PeerContact {
  if (!value || typeof value !== 'object') return false;
  const c = value as PeerContact;
  if (
    Object.keys(c).length !== 7 ||
    c.version !== 1 ||
    typeof c.owner !== 'string' ||
    c.owner !== expectedOwner ||
    typeof c.onion !== 'string' ||
    !onionPattern.test(c.onion) ||
    typeof c.capability !== 'string' ||
    !capabilityPattern.test(c.capability) ||
    !Number.isSafeInteger(now) ||
    !Number.isSafeInteger(c.issuedAt) ||
    !Number.isSafeInteger(c.expiresAt) ||
    c.issuedAt < 1 ||
    c.issuedAt > now ||
    c.expiresAt <= now ||
    c.expiresAt <= c.issuedAt ||
    c.expiresAt - c.issuedAt > 24 * 60 * 60_000 ||
    typeof c.signature !== 'string'
  )
    return false;
  const key = publicKeyFromDid(c.owner);
  const signature = base64UrlToBytes(c.signature);
  return !!key && !!signature && verify(signature, message(c), key);
}
