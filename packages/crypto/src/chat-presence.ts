import { sign, verify } from './sign';
import { bytesToBase64Url, base64UrlToBytes } from './bytes';
import { publicKeyFromDid } from './did';
import type { Identity } from './keys';

export type ChatPresence = {
  version: 1;
  sender: string;
  recipient: string;
  active: boolean;
  at: number;
  expiresAt: number;
  signature: string;
};
const bytes = (p: Omit<ChatPresence, 'signature'>) =>
  new TextEncoder().encode(
    JSON.stringify(['tero-chat-presence/v1', p.sender, p.recipient, p.active, p.at, p.expiresAt]),
  );
export function signChatPresence(
  identity: Identity,
  recipient: string,
  active: boolean,
): ChatPresence {
  const at = Date.now();
  const p = {
    version: 1 as const,
    sender: identity.did,
    recipient,
    active,
    at,
    expiresAt: at + 60_000,
  };
  return { ...p, signature: bytesToBase64Url(sign(bytes(p), identity.secretKey)) };
}
export function verifyChatPresence(
  value: unknown,
  sender: string,
  recipient: string,
  now = Date.now(),
): value is ChatPresence {
  if (!value || typeof value !== 'object') return false;
  const p = value as ChatPresence;
  const key = publicKeyFromDid(sender);
  const signature = typeof p.signature === 'string' ? base64UrlToBytes(p.signature) : null;
  return (
    p.version === 1 &&
    p.sender === sender &&
    p.recipient === recipient &&
    sender !== recipient &&
    typeof p.active === 'boolean' &&
    Number.isSafeInteger(p.at) &&
    p.at <= now + 15_000 &&
    Number.isSafeInteger(p.expiresAt) &&
    p.expiresAt === p.at + 60_000 &&
    p.expiresAt > now &&
    !!key &&
    !!signature &&
    signature.length === 64 &&
    verify(signature, bytes(p), key)
  );
}
