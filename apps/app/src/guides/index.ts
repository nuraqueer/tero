import type { Suit } from '@/components/SuitIcon';
import { hrtBasics } from './hrt-basics';
import { onlineSafety } from './online-safety';
import type { GuideText } from './types';

export type Guide = {
  slug: string;
  suit: Suit;
  /** i18n key stem: guide.<key>.title and guide.<key>.summary. */
  key: string;
  /** Null while the guide is still being written with experts. */
  text: GuideText | null;
};

/** The open guides, readable by anyone without an account. */
export const guides: Guide[] = [
  { slug: 'staying-safe-online', suit: 'swords', key: 'online', text: onlineSafety },
  { slug: 'hrt-basics', suit: 'wands', key: 'hrt', text: hrtBasics },
  { slug: 'finding-affirming-care', suit: 'wands', key: 'care', text: null },
  { slug: 'know-your-rights', suit: 'swords', key: 'rights', text: null },
  { slug: 'when-you-need-someone', suit: 'cups', key: 'someone', text: null },
  { slug: 'free-courses', suit: 'wands', key: 'courses', text: null },
];
