import type { Suit } from '@/components/SuitIcon';

/** What a part of a suit looks like inside. */
export type PartKind =
  'directory' | 'aid' | 'jobs' | 'stories' | 'skills' | 'showCard' | 'journeys' | 'list';

/** The parts of each suit, after the founder's Transspace structure (2026-10-06). */
export const suitParts: Record<Suit, string[]> = {
  cups: ['mentalHealth', 'listen', 'communities', 'stories'],
  pentacles: ['jobs', 'aid', 'fundraisers'],
  swords: ['safeSpaces', 'legal', 'travel', 'showCard'],
  wands: ['providers', 'affirming', 'generalHealth', 'skills', 'journeys'],
};

export const partKind: Record<string, PartKind> = {
  mentalHealth: 'directory',
  listen: 'list',
  communities: 'list',
  stories: 'stories',
  jobs: 'jobs',
  aid: 'aid',
  fundraisers: 'list',
  safeSpaces: 'directory',
  legal: 'directory',
  travel: 'directory',
  showCard: 'showCard',
  providers: 'directory',
  affirming: 'directory',
  generalHealth: 'directory',
  skills: 'skills',
  journeys: 'journeys',
};

export const allParts = Object.values(suitParts).flat();
