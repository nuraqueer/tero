import type { Area } from '@/components/AreaIcon';
import { hrtBasics } from './hrt-basics';
import { onlineSafety } from './online-safety';
import type { GuideText } from './types';

export type Guide = {
  slug: string;
  area: Area;
  /** i18n key stem: guide.<key>.title and guide.<key>.summary. */
  key: string;
  /** Null while the guide is still being written with experts. */
  text: GuideText | null;
};

/** The open guides, readable by anyone without an account. */
export const guides: Guide[] = [
  { slug: 'staying-safe-online', area: 'safety', key: 'online', text: onlineSafety },
  { slug: 'hrt-basics', area: 'health', key: 'hrt', text: hrtBasics },
  { slug: 'finding-affirming-care', area: 'health', key: 'care', text: null },
  { slug: 'know-your-rights', area: 'safety', key: 'rights', text: null },
  { slug: 'when-you-need-someone', area: 'care', key: 'someone', text: null },
  { slug: 'free-courses', area: 'health', key: 'courses', text: null },
];
