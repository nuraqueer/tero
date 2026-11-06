import { describe, expect, it } from 'vitest';
import { publicGuide, publicGuides } from '../src/lib/guide-catalog';

describe('public guides migration', () => {
  it('publishes only finished guides and keeps slugs unique', () => {
    expect(publicGuides.length).toBe(2);
    expect(new Set(publicGuides.map((guide) => guide.slug)).size).toBe(publicGuides.length);
    for (const guide of publicGuides) {
      expect(guide.content.sections.length).toBeGreaterThan(0);
      expect(guide.content.sections.every((section) => section.heading && section.paragraphs.length > 0)).toBe(true);
    }
  });

  it('does not expose unpublished or unknown guide slugs', () => {
    expect(publicGuide('finding-affirming-care')).toBeUndefined();
    expect(publicGuide('../internal')).toBeUndefined();
  });
});
