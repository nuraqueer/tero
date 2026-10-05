import { describe, expect, it } from 'vitest';
import { randomBytes } from './bytes';
import { openText, sealText } from './box';

describe('sealed boxes', () => {
  const key = randomBytes(32);
  it('opens with the same key and context', () => {
    const box = sealText(key, 'journeys/v1', 'my plans ✓');
    expect(openText(key, 'journeys/v1', box)).toBe('my plans ✓');
  });
  it('refuses the wrong key, the wrong context and a changed box', () => {
    const box = sealText(key, 'journeys/v1', 'secret');
    expect(openText(randomBytes(32), 'journeys/v1', box)).toBeNull();
    expect(openText(key, 'other/v1', box)).toBeNull();
    const changed = (box[40] === 'A' ? 'B' : 'A') + box.slice(1);
    expect(
      openText(key, 'journeys/v1', box.slice(0, 40) + changed.slice(0, 1) + box.slice(41)),
    ).toBeNull();
    expect(openText(key, 'journeys/v1', 'not a box')).toBeNull();
  });
  it('hides the exact size', () => {
    expect(sealText(key, 'c', 'a').length).toBe(sealText(key, 'c', 'a'.repeat(900)).length);
  });
});
