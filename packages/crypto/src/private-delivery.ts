import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { base64UrlToBytes, bytesToBase64Url, randomBytes } from './bytes';
import { openText, sealText } from './box';
import { publicKeyFromDid } from './did';
import { sign, verify } from './sign';
import { isSealedObject, isSealedObjectId, sealedObjectId, type SealedObject } from './sealed-post';
import { verifyPeerContact, type PeerContact } from './peer-contact';
import type { Identity } from './keys';

/** Transitional pair coordination. Payload and private onion capability stay encrypted. */
export type DeliveryDescriptor = {
  version: 1;
  sender: string;
  recipient: string;
  ephemeral: string;
  objectId: string;
  expiresAt: number;
  hint: string;
  signature: string;
};
export type DeliveryPayload = {
  kind: 'KEY_PACKAGE' | 'WELCOME' | 'APPLICATION' | 'CONTROL';
  wire: string;
};
const domain = 'tero-private-delivery/v1';
const week = 7 * 86_400_000;
const context = (d: Omit<DeliveryDescriptor, 'objectId' | 'hint' | 'signature'>) =>
  JSON.stringify([domain, d.sender, d.recipient, d.ephemeral, d.expiresAt]);
const signingBytes = (d: Omit<DeliveryDescriptor, 'signature'>) =>
  utf8ToBytes(
    JSON.stringify([domain, d.sender, d.recipient, d.ephemeral, d.objectId, d.expiresAt, d.hint]),
  );
const canonical = (s: unknown, length: number) => {
  if (typeof s !== 'string') return false;
  const b = base64UrlToBytes(s);
  return b?.length === length && bytesToBase64Url(b) === s;
};
export function verifyDeliveryDescriptor(value: unknown, now: number): value is DeliveryDescriptor {
  if (!value || typeof value !== 'object') return false;
  const d = value as DeliveryDescriptor;
  if (
    Object.keys(d).length !== 8 ||
    d.version !== 1 ||
    typeof d.sender !== 'string' ||
    typeof d.recipient !== 'string' ||
    d.sender === d.recipient ||
    !canonical(d.ephemeral, 32) ||
    !isSealedObjectId(d.objectId) ||
    !Number.isSafeInteger(now) ||
    !Number.isSafeInteger(d.expiresAt) ||
    d.expiresAt <= now ||
    d.expiresAt > now + week ||
    typeof d.hint !== 'string' ||
    d.hint.length > 4096 ||
    !canonical(d.signature, 64)
  )
    return false;
  const sender = publicKeyFromDid(d.sender);
  return (
    !!sender &&
    !!publicKeyFromDid(d.recipient) &&
    verify(base64UrlToBytes(d.signature)!, signingBytes(d), sender)
  );
}
function payloadValid(p: unknown): p is DeliveryPayload {
  if (!p || typeof p !== 'object') return false;
  const v = p as DeliveryPayload;
  if (
    Object.keys(v).length !== 2 ||
    !['KEY_PACKAGE', 'WELCOME', 'APPLICATION', 'CONTROL'].includes(v.kind) ||
    typeof v.wire !== 'string' ||
    v.wire.length > 90_000
  )
    return false;
  const wire = base64UrlToBytes(v.wire);
  return !!wire && wire.length > 0 && wire.length <= 65536 && bytesToBase64Url(wire) === v.wire;
}
export function sealDelivery(
  identity: Identity,
  recipient: string,
  payload: DeliveryPayload,
  expiresAt: number,
  contact: PeerContact | null = null,
) {
  const recipientKey = publicKeyFromDid(recipient);
  const time = Date.now();
  if (
    !recipientKey ||
    recipient === identity.did ||
    !payloadValid(payload) ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= time ||
    expiresAt > time + week ||
    (contact && !verifyPeerContact(contact, identity.did, time))
  )
    throw new Error('Invalid delivery');
  const ephemeralSecret = randomBytes(32);
  let shared: Uint8Array | undefined;
  let key: Uint8Array | undefined;
  try {
    const d = {
      version: 1 as const,
      sender: identity.did,
      recipient,
      ephemeral: bytesToBase64Url(x25519.getPublicKey(ephemeralSecret)),
      expiresAt,
    };
    const ctx = context(d);
    shared = x25519.getSharedSecret(ephemeralSecret, ed25519.utils.toMontgomery(recipientKey));
    key = hkdf(sha256, shared, utf8ToBytes(domain), utf8ToBytes(ctx), 32);
    const box = sealText(key, `${ctx}/object`, JSON.stringify(payload));
    const object: SealedObject = { version: 1, id: sealedObjectId(expiresAt, box), expiresAt, box };
    if (!isSealedObject(object)) throw new Error('Delivery exceeds carrier limit');
    const descriptor = {
      ...d,
      objectId: object.id,
      hint: sealText(key, `${ctx}/hint`, JSON.stringify(contact)),
    };
    return {
      object,
      descriptor: {
        ...descriptor,
        signature: bytesToBase64Url(sign(signingBytes(descriptor), identity.secretKey)),
      },
    };
  } finally {
    ephemeralSecret.fill(0);
    shared?.fill(0);
    key?.fill(0);
  }
}
export function openDelivery(
  identity: Identity,
  descriptor: unknown,
  expectedSender: string,
  object?: unknown,
): { contact: PeerContact | null; payload: DeliveryPayload | null } | null {
  const time = Date.now();
  if (
    !verifyDeliveryDescriptor(descriptor, time) ||
    descriptor.recipient !== identity.did ||
    descriptor.sender !== expectedSender
  )
    return null;
  let secret: Uint8Array | undefined, shared: Uint8Array | undefined, key: Uint8Array | undefined;
  try {
    secret = ed25519.utils.toMontgomerySecret(identity.secretKey);
    shared = x25519.getSharedSecret(secret, base64UrlToBytes(descriptor.ephemeral)!);
    const ctx = context(descriptor);
    key = hkdf(sha256, shared, utf8ToBytes(domain), utf8ToBytes(ctx), 32);
    const hint = openText(key, `${ctx}/hint`, descriptor.hint);
    if (hint === null) return null;
    const contact: unknown = JSON.parse(hint);
    const validContact =
      contact !== null && verifyPeerContact(contact, expectedSender, time) ? contact : null;
    if (object === undefined) return { contact: validContact, payload: null };
    if (
      !isSealedObject(object) ||
      object.id !== descriptor.objectId ||
      object.expiresAt !== descriptor.expiresAt
    )
      return null;
    const plain = openText(key, `${ctx}/object`, object.box);
    const payload: unknown = plain === null ? null : JSON.parse(plain);
    return payloadValid(payload) ? { contact: validContact, payload } : null;
  } catch {
    return null;
  } finally {
    secret?.fill(0);
    shared?.fill(0);
    key?.fill(0);
  }
}
