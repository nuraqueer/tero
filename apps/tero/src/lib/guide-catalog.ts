// Reuse the legacy reviewed source until content is moved to a shared package.
// Do not duplicate safety/health copy or present unpublished drafts as guides.
import { onlineSafety } from '../../../app/src/guides/online-safety';
import { hrtBasics } from '../../../app/src/guides/hrt-basics';

export const publicGuides = [
  {
    slug: 'staying-safe-online',
    title: 'Staying safe online',
    summary: 'Practical steps for protecting your device and your privacy.',
    content: onlineSafety.en,
  },
  {
    slug: 'hrt-basics',
    title: 'HRT basics',
    summary: 'An introduction to gender-affirming hormone care.',
    content: hrtBasics.en,
  },
] as const;

export function publicGuide(slug: string) {
  return publicGuides.find((guide) => guide.slug === slug);
}
