import type { Area } from '@/components/AreaIcon';

/** What a part looks like inside. */
export type PartKind =
  'directory' | 'aid' | 'jobs' | 'stories' | 'skills' | 'showCard' | 'journeys' | 'list';

/** The parts of each area of help (after the founder's Transspace structure, 2026-10-06). */
export const areaParts: Record<Area, string[]> = {
  care: ['mentalHealth', 'listen', 'communities', 'stories'],
  work: ['jobs', 'aid', 'fundraisers'],
  safety: ['safeSpaces', 'legal', 'travel', 'showCard'],
  health: ['providers', 'affirming', 'generalHealth', 'skills', 'journeys'],
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

export const allParts = Object.values(areaParts).flat();
