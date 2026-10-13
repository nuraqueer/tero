import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { base64UrlToBytes, bytesToBase64Url, randomBytes } from './bytes';
import { openText, sealText } from './box';
import { publicKeyFromDid } from './did';
import type { Identity } from './keys';
import { sign, verify } from './sign';

export type DirectoryGrant = {
  directory: string;
  sender: string;
  recipient: string;
  ephemeral: string;
  box: string;
  signature: string;
};
export type ProfileEnvelope = {
  directory: string;
  owner: string;
  handleTag: string;
  revision: number;
  box: string;
  signature: string;
};
export type MemberProfile = { handle: string; displayName: string };
const domain = 'tero-directory/v1';
const bytes = (value: unknown) => utf8ToBytes(JSON.stringify(value));
const token = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const box = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length >= 1400 &&
  value.length <= 8192 &&
  /^[A-Za-z0-9_-]+$/.test(value);
export function normalizeHandle(value: string): string | null {
  const result = value.trim().replace(/^@/, '').toLowerCase();
  return /^[a-z][a-z0-9_-]{2,23}$/.test(result) ? result : null;
}
export function isDisplayName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim() === value &&
    value.length > 0 &&
    value.length <= 64 &&
    !/[\p{Cc}\p{Cf}]/u.test(value)
  );
}
export const directoryId = (key: Uint8Array) =>
  bytesToBase64Url(sha256(bytes([domain, bytesToBase64Url(key)])));
export const directoryHandleTag = (key: Uint8Array, handle: string) =>
  bytesToBase64Url(hmac(sha256, key, bytes([domain, 'handle', handle])));
function grantMessage(g: Omit<DirectoryGrant, 'signature'>) {
  return bytes([domain, 'grant', g.directory, g.sender, g.recipient, g.ephemeral, g.box]);
}
export function verifyDirectoryGrant(value: unknown): value is DirectoryGrant {
  if (!value || typeof value !== 'object') return false;
  const g = value as DirectoryGrant;
  if (
    Object.keys(g).length !== 6 ||
    !token(g.directory) ||
    !token(g.ephemeral) ||
    !box(g.box) ||
    g.box.length > 4096 ||
    typeof g.sender !== 'string' ||
    typeof g.recipient !== 'string' ||
    typeof g.signature !== 'string'
  )
    return false;
  const pub = publicKeyFromDid(g.sender);
  const sig = base64UrlToBytes(g.signature);
  return !!pub && !!publicKeyFromDid(g.recipient) && !!sig && verify(sig, grantMessage(g), pub);
}
export function grantDirectoryKey(
  identity: Identity,
  recipient: string,
  key: Uint8Array,
): DirectoryGrant {
  const recipientPublic = publicKeyFromDid(recipient);
  if (!recipientPublic || key.length !== 32) throw new Error('invalid directory recipient');
  const ephemeralSecret = randomBytes(32);
  const ephemeral = bytesToBase64Url(x25519.getPublicKey(ephemeralSecret));
  const directory = directoryId(key);
  const context = JSON.stringify([domain, directory, identity.did, recipient, ephemeral]);
  const shared = x25519.getSharedSecret(
    ephemeralSecret,
    ed25519.utils.toMontgomery(recipientPublic),
  );
  const wrappingKey = hkdf(sha256, shared, utf8ToBytes(domain), utf8ToBytes(context), 32);
  try {
    const grant = {
      directory,
      sender: identity.did,
      recipient,
      ephemeral,
      box: sealText(wrappingKey, context, bytesToBase64Url(key)),
    };
    return { ...grant, signature: bytesToBase64Url(sign(grantMessage(grant), identity.secretKey)) };
  } finally {
    ephemeralSecret.fill(0);
    shared.fill(0);
    wrappingKey.fill(0);
  }
}
export function openDirectoryKey(
  identity: Identity,
  grant: unknown,
  expectedDirectory: string,
): Uint8Array | null {
  if (
    !verifyDirectoryGrant(grant) ||
    grant.recipient !== identity.did ||
    grant.directory !== expectedDirectory
  )
    return null;
  let secret: Uint8Array | undefined;
  let shared: Uint8Array | undefined;
  let wrappingKey: Uint8Array | undefined;
  try {
    secret = ed25519.utils.toMontgomerySecret(identity.secretKey);
    shared = x25519.getSharedSecret(secret, base64UrlToBytes(grant.ephemeral)!);
    const context = JSON.stringify([
      domain,
      grant.directory,
      grant.sender,
      grant.recipient,
      grant.ephemeral,
    ]);
    wrappingKey = hkdf(sha256, shared, utf8ToBytes(domain), utf8ToBytes(context), 32);
    const text = openText(wrappingKey, context, grant.box);
    const key = text ? base64UrlToBytes(text) : null;
    if (key?.length === 32 && directoryId(key) === expectedDirectory) return key;
    key?.fill(0);
    return null;
  } catch {
    return null;
  } finally {
    secret?.fill(0);
    shared?.fill(0);
    wrappingKey?.fill(0);
  }
}
function profileMessage(p: Omit<ProfileEnvelope, 'signature'>) {
  return bytes([domain, 'profile', p.directory, p.owner, p.handleTag, p.revision, p.box]);
}
export function verifyProfileEnvelope(value: unknown): value is ProfileEnvelope {
  if (!value || typeof value !== 'object') return false;
  const p = value as ProfileEnvelope;
  if (
    Object.keys(p).length !== 6 ||
    !token(p.directory) ||
    !token(p.handleTag) ||
    !box(p.box) ||
    !Number.isSafeInteger(p.revision) ||
    p.revision < 1 ||
    typeof p.owner !== 'string' ||
    typeof p.signature !== 'string'
  )
    return false;
  const pub = publicKeyFromDid(p.owner);
  const sig = base64UrlToBytes(p.signature);
  return !!pub && !!sig && verify(sig, profileMessage(p), pub);
}
export function sealMemberProfile(
  identity: Identity,
  key: Uint8Array,
  profile: MemberProfile,
  revision: number,
): ProfileEnvelope {
  if (
    normalizeHandle(profile.handle) !== profile.handle ||
    !isDisplayName(profile.displayName) ||
    !Number.isSafeInteger(revision) ||
    revision < 1
  )
    throw new Error('invalid profile');
  const directory = directoryId(key);
  const handleTag = directoryHandleTag(key, profile.handle);
  const context = JSON.stringify([domain, directory, identity.did, handleTag, revision]);
  const p = {
    directory,
    owner: identity.did,
    handleTag,
    revision,
    box: sealText(key, context, JSON.stringify(profile)),
  };
  return { ...p, signature: bytesToBase64Url(sign(profileMessage(p), identity.secretKey)) };
}
export function openMemberProfile(
  key: Uint8Array,
  envelope: unknown,
  expectedOwner: string,
): MemberProfile | null {
  if (
    !verifyProfileEnvelope(envelope) ||
    envelope.owner !== expectedOwner ||
    envelope.directory !== directoryId(key)
  )
    return null;
  try {
    const context = JSON.stringify([
      domain,
      envelope.directory,
      envelope.owner,
      envelope.handleTag,
      envelope.revision,
    ]);
    const text = openText(key, context, envelope.box);
    const p: unknown = text === null ? null : JSON.parse(text);
    if (!p || typeof p !== 'object') return null;
    const profile = p as MemberProfile;
    return Object.keys(profile).length === 2 &&
      typeof profile.handle === 'string' &&
      normalizeHandle(profile.handle) === profile.handle &&
      isDisplayName(profile.displayName) &&
      directoryHandleTag(key, profile.handle) === envelope.handleTag
      ? profile
      : null;
  } catch {
    return null;
  }
}
