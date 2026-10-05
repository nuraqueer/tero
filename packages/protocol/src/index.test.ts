import { describe, expect, it } from 'vitest';
import {
  cardUrl,
  drawArcana,
  isApproveCardRequest,
  isClaimCardRequest,
  isCreateCardRequest,
  isSignInRequest,
  openCardLimit,
  signInMessage,
  tokenFromCardLink,
} from './index';

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

describe('card links', () => {
  const token = 'abcdefghijklmnopqrstuv';

  it('finds the token in links and bare text', () => {
    expect(tokenFromCardLink(`https://tero.pherus.org/c/${token}`)).toBe(token);
    expect(tokenFromCardLink(`  https://tero.pherus.org/c/${token}/?x=1 `)).toBe(token);
    expect(tokenFromCardLink(token)).toBe(token);
    expect(cardUrl('https://tero.pherus.org', token)).toBe(`https://tero.pherus.org/c/${token}`);
  });

  it('ignores anything else', () => {
    expect(tokenFromCardLink('https://tero.pherus.org/c/short')).toBeNull();
    expect(tokenFromCardLink(`https://tero.pherus.org/c/${token}x`)).toBeNull();
    expect(tokenFromCardLink('hello')).toBeNull();
  });

  it('checks card requests', () => {
    const id = 'a'.repeat(43);
    expect(isCreateCardRequest({ id, nonce: token, type: 'member' })).toBe(true);
    expect(isCreateCardRequest({ id, nonce: token, type: 'council' })).toBe(false);
    expect(isClaimCardRequest({ token, adult: true })).toBe(true);
    expect(isClaimCardRequest({ token, adult: false })).toBe(false);
    expect(isApproveCardRequest({ claimer: 'did:key:z6Mk', adult: true })).toBe(true);
    expect(isApproveCardRequest({ claimer: 'did:key:z6Mk' })).toBe(false);
  });

  it('allows fewer open cards at newer Sequences', () => {
    expect(openCardLimit(9)).toBe(1);
    expect(openCardLimit(0)).toBeGreaterThan(openCardLimit(1));
    for (let s = 1; s <= 9; s++) expect(openCardLimit(s)).toBeLessThanOrEqual(openCardLimit(s - 1));
  });
});

describe('drawArcana', () => {
  it("can draw every card but the Fool and the giver's", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 20; i++) seen.add(drawArcana(7, () => i / 20));
    expect(seen.size).toBe(20);
    expect(seen.has(0)).toBe(false);
    expect(seen.has(7)).toBe(false);
    expect(drawArcana(null, () => 0.999)).toBe(21);
  });
});
