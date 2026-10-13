import { describe, expect, it } from 'vitest';
import { navigationScroll } from './navigation-scroll';

describe('scroll driven navigation', () => {
  it('collapses after deliberate forward travel and reveals on reverse travel', () => {
    const start = navigationScroll(null, 25, 400);
    const small = navigationScroll(start, 32, 400);
    expect(small.collapsed).toBe(false);
    const collapsed = navigationScroll(small, 46, 400);
    expect(collapsed.collapsed).toBe(true);
    const jitter = navigationScroll(collapsed, 40, 400);
    expect(jitter.collapsed).toBe(true);
    expect(navigationScroll(jitter, 32, 400).collapsed).toBe(false);
  });

  it('ignores elastic scrolling outside the content boundaries', () => {
    const bottom = navigationScroll({ offset: 390, anchor: 380, collapsed: true }, 420, 400);
    expect(bottom.offset).toBe(400);
    expect(navigationScroll(bottom, 410, 400).collapsed).toBe(true);
    expect(navigationScroll(bottom, -20, 400).collapsed).toBe(false);
    expect(navigationScroll(null, 100, 0).collapsed).toBe(false);
  });
});
