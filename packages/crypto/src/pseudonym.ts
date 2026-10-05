import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { base64urlnopad } from '@scure/base';

/**
 * A stand-in for a member's key, made with a server secret, so stored rows don't say
 * who wrote them. The same key, secret and purpose always give the same stand-in;
 * different purposes give unlinkable ones. Someone with the secret and the member list
 * can still work it out, so this protects against a copied database, not the operator.
 */
export function pseudonym(secret: string, purpose: string, did: string): string {
  const mac = hmac(
    sha256,
    utf8ToBytes(secret),
    utf8ToBytes(`tero-pseudonym/v1\n${purpose}\n${did}`),
  );
  return base64urlnopad.encode(mac);
}
