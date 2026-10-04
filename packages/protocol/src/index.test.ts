import { describe, expect, it } from 'vitest';
import { isSignInRequest, signInMessage } from './index';

describe('protocol', () => {
  it('prefixes the sign-in message', () => {
    expect(new TextDecoder().decode(signInMessage('abc'))).toBe('tero-sign-in/v1\nabc');
  });

  it('checks sign-in requests', () => {
    expect(isSignInRequest({ did: 'did:key:z6Mk', challenge: 'c', signature: 's' })).toBe(true);
    expect(isSignInRequest({ did: 'did:key:z6Mk', challenge: 'c' })).toBe(false);
    expect(isSignInRequest({ did: 1, challenge: 'c', signature: 's' })).toBe(false);
    expect(isSignInRequest({ did: 'x'.repeat(500), challenge: 'c', signature: 's' })).toBe(false);
    expect(isSignInRequest(null)).toBe(false);
  });
});
