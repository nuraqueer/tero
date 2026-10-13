import { describe, expect, it } from 'vitest';
import { compactMemberCount } from './member-count';

describe('member count labels', () => {
  it.each([
    [0, '0'],
    [99, '99'],
    [100, '100'],
    [300, '300'],
    [999, '999'],
    [1000, '1k'],
    [2000, '2k'],
    [24000, '24k'],
    [4500000, '4.5m'],
    [999999, '1m'],
    [1000000000, '1b'],
  ])('formats %i as %s', (count, expected) => {
    expect(compactMemberCount(count)).toBe(expected);
  });
  it.each([-1, NaN, Infinity, 1.5])('rejects invalid totals: %s', (count) => {
    expect(() => compactMemberCount(count)).toThrow(RangeError);
  });
});
