import { describe, expect, it } from 'vitest';
import { colors, contrastRatio } from './index';

// Pairs that carry text in the designs, and the WCAG AA ratio each must reach.
const textPairs: Array<[string, keyof typeof colors, keyof typeof colors, number]> = [
  ['body text on ivory', 'slate', 'ivory', 4.5],
  ['secondary text on ivory', 'textSecondary', 'ivory', 4.5],
  ['muted text on ivory', 'textMuted', 'ivory', 4.5],
  ['accent text on ivory', 'clayText', 'ivory', 4.5],
  ['ivory text on slate buttons', 'ivory', 'slate', 4.5],
  ['gold lettering on tarot cards', 'goldLight', 'slate', 4.5],
  ['slate text on oat bubbles', 'slate', 'oat', 4.5],
];

describe('colour contrast', () => {
  it.each(textPairs)('%s meets WCAG AA', (_label, fg, bg, min) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
  });

  it('computes known ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });
});
