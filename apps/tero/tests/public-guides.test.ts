import { describe, expect, it } from 'vitest';
import { guideLanguages, isGuideLocale, publicGuide, publicGuides } from '../src/lib/guide-catalog';

describe('public guides migration', () => {
  it('publishes only finished guides and keeps slugs unique', () => {
    expect(publicGuides.length).toBe(2);
    expect(new Set(publicGuides.map((guide) => guide.slug)).size).toBe(publicGuides.length);
    for (const guide of publicGuides) {
      for (const { code } of guideLanguages) {
        expect(guide.content[code].sections.length).toBeGreaterThan(0);
        expect(guide.content[code].sections.every((section) => section.heading && section.paragraphs.length > 0)).toBe(true);
      }
    }
  });

  it('accepts only the four published language codes', () => {
    expect(['en', 'sw', 'fr', 'zh'].every(isGuideLocale)).toBe(true);
    expect(isGuideLocale('unknown')).toBe(false);
    expect(isGuideLocale('../en')).toBe(false);
  });

  it('does not expose unpublished or unknown guide slugs', () => {
    expect(publicGuide('finding-affirming-care')).toBeUndefined();
    expect(publicGuide('../internal')).toBeUndefined();
  });
});
