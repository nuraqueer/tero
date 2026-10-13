import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { AidPost, Job, Skill, Story } from '@tero/protocol';
import { useFullSession } from './session';
export type HelpOverview = {
  aid: AidPost[] | null;
  jobs: Job[] | null;
  skills: Skill[] | null;
  stories: Story[] | null;
};
const empty: HelpOverview = { aid: null, jobs: null, skills: null, stories: null };
/** Real existing boards, refreshed on focus/pull. Null means unavailable, never a fake zero. */
export function useHelpOverview() {
  const session = useFullSession();
  const api = session?.api;
  const admitted = session?.member === true && session.connection === 'connected';
  const [data, setData] = useState<HelpOverview>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const reload = useRef<() => Promise<void>>(async () => {});
  useFocusEffect(
    useCallback(() => {
      let live = true;
      const load = async () => {
        const current = ++generation.current;
        const client = api?.();
        if (!admitted || !client) {
          setData(empty);
          setLoading(false);
          setError(false);
          return;
        }
        setLoading(true);
        setError(false);
        const [aid, jobs, skills, stories] = await Promise.allSettled([
          client.listAid(),
          client.listJobs(),
          client.listSkills(),
          client.listStories(),
        ]);
        if (!live || current !== generation.current) return;
        setData({
          aid: aid.status === 'fulfilled' ? aid.value : null,
          jobs: jobs.status === 'fulfilled' ? jobs.value : null,
          skills: skills.status === 'fulfilled' ? skills.value : null,
          stories: stories.status === 'fulfilled' ? stories.value : null,
        });
        setError([aid, jobs, skills, stories].some((v) => v.status === 'rejected'));
        setLoading(false);
      };
      void load();
      reload.current = load;
      return () => {
        live = false;
        generation.current++;
        reload.current = async () => {};
      };
    }, [api, admitted]),
  );
  return { ...data, loading, error, refresh: () => reload.current() };
}
