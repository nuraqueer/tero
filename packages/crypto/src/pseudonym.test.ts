import { describe, expect, it } from 'vitest';
import { pseudonym } from './pseudonym';

describe('pseudonym', () => {
  it('is stable for the same secret, purpose and key', () => {
    expect(pseudonym('s', 'a', 'did:key:x')).toBe(pseudonym('s', 'a', 'did:key:x'));
  });
  it('differs across purposes, secrets and keys', () => {
    const base = pseudonym('s', 'a', 'did:key:x');
    expect(pseudonym('s', 'b', 'did:key:x')).not.toBe(base);
    expect(pseudonym('t', 'a', 'did:key:x')).not.toBe(base);
    expect(pseudonym('s', 'a', 'did:key:y')).not.toBe(base);
    expect(base).not.toContain('did');
  });
});
