import { describe, expect, it } from 'vitest';
import { randomBytes } from './bytes';
import { cardCode, cardIdFromToken, cardToken } from './cards';

describe('Tero cards', () => {
  const secret = randomBytes(32);

  it('makes the same token from the same secret and nonce', () => {
    const nonce = randomBytes(16);
    expect(cardToken(secret, nonce)).toBe(cardToken(secret, nonce));
    expect(cardToken(secret, nonce)).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it('makes different tokens for other nonces and secrets', () => {
    const nonce = randomBytes(16);
    expect(cardToken(secret, nonce)).not.toBe(cardToken(secret, randomBytes(16)));
    expect(cardToken(secret, nonce)).not.toBe(cardToken(randomBytes(32), nonce));
  });

  it('refuses a nonce of the wrong size', () => {
    expect(() => cardToken(secret, randomBytes(8))).toThrow();
  });

  it('hashes the token into an id that does not reveal it', () => {
    const token = cardToken(secret, randomBytes(16));
    const id = cardIdFromToken(token);
    expect(id).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(id).not.toContain(token);
  });

  it('gives a six-digit code that depends on both the card and the key', () => {
    const code = cardCode('card-a', 'did:key:z6MkA');
    expect(code).toMatch(/^\d{6}$/);
    expect(cardCode('card-a', 'did:key:z6MkA')).toBe(code);
    const others = new Set(
      Array.from({ length: 20 }, (_, i) => cardCode('card-a', `did:key:z6Mk${i}`)),
    );
    expect(others.size).toBeGreaterThan(15);
    expect(cardCode('card-b', 'did:key:z6MkA')).not.toBe(code);
  });
});
