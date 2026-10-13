import type { AidPost, Job, Skill, Story } from '@tero/protocol';
export type CommunityUpdate = {
  id: string;
  part: 'aid' | 'jobs' | 'skills' | 'stories';
  title: string;
  addedOn: number;
  warning: string;
  preview: string;
  mine: boolean;
  replies?: number;
  closed?: boolean;
};
/** Anonymous board previews with coarse dates. Story bodies stay behind their content note. */
export function communityUpdates(
  data: {
    aid: AidPost[] | null;
    jobs: Job[] | null;
    skills: Skill[] | null;
    stories: Story[] | null;
  },
  includeClosed = false,
): CommunityUpdate[] {
  const items: CommunityUpdate[] = [
    ...(data.aid ?? [])
      .filter((v) => v.open || (includeClosed && v.mine))
      .map((v) => ({
        id: v.id,
        part: 'aid' as const,
        title: v.title,
        addedOn: v.addedOn,
        warning: '',
        preview: v.details,
        mine: v.mine,
        replies: v.mine ? v.replies : undefined,
        closed: !v.open,
      })),
    ...(data.jobs ?? []).map((v) => ({
      id: v.id,
      part: 'jobs' as const,
      title: v.title,
      addedOn: v.addedOn,
      warning: '',
      preview: v.details,
      mine: v.mine,
    })),
    ...(data.skills ?? []).map((v) => ({
      id: v.id,
      part: 'skills' as const,
      title: v.title,
      addedOn: v.addedOn,
      warning: '',
      preview: v.details,
      mine: v.mine,
      replies: v.mine && v.kind !== 'resource' ? v.replies : undefined,
    })),
    ...(data.stories ?? []).map((v) => ({
      id: v.id,
      part: 'stories' as const,
      title: v.title,
      addedOn: v.addedOn,
      warning: v.warning,
      preview: '',
      mine: v.mine,
    })),
  ];
  return items.sort((a, b) => b.addedOn - a.addedOn);
}
/** A feed link brings the actual post to the top without exposing any extra fields. */
export function prioritizePost<T extends { id: string }>(items: T[], focus?: string): T[] {
  return focus ? [...items].sort((a, b) => Number(b.id === focus) - Number(a.id === focus)) : items;
}
