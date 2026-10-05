import { DatabaseSync } from 'node:sqlite';
import type { Env, RegistryApi } from './index';
import { Registry, type Sql } from './registry';

/** A registry on an in-memory SQLite database, for tests. */
export function memorySql(): Sql {
  const db = new DatabaseSync(':memory:');
  return {
    exec: (query, ...bindings) => {
      const rows = db.prepare(query).all(...bindings);
      return {
        toArray: () => rows.map((row) => ({ ...row })) as Record<string, string | number | null>[],
      };
    },
  };
}

/** Stands in for the Durable Object namespace, with a clock tests can move. */
export function testRegistry(founder?: string, clock = { now: Date.now() }) {
  const registry = new Registry(memorySql(), founder);
  const api: RegistryApi = {
    member: (did) => registry.member(did, clock.now),
    founderSeatOpen: () => registry.founderSeatOpen(),
    stats: () => registry.stats(clock.now),
    claimFounder: (did) => registry.claimFounder(did, clock.now),
    listCards: (inviter) => registry.listCards(inviter, clock.now),
    createCard: (inviter, card) => registry.createCard(inviter, card, clock.now),
    claimCard: (claimer, id) => registry.claimCard(claimer, id, clock.now),
    approveCard: (inviter, id, claimer) => registry.approveCard(inviter, id, claimer, clock.now),
    destroyCard: (inviter, id) => registry.destroyCard(inviter, id),
    listPlaces: (did, part) => registry.listPlaces(did, part, clock.now),
    addPlace: (did, place) => registry.addPlace(did, place, clock.now),
    vouchPlace: (did, id, vouch) => registry.vouchPlace(did, id, vouch, clock.now),
    removePlace: (did, id) => registry.removePlace(did, id, clock.now),
    listAid: (did) => registry.aid.list(did, clock.now),
    addAid: (did, post) => registry.aid.add(did, post, clock.now),
    replyAid: (did, id, note) => registry.aid.reply(did, id, note, clock.now),
    aidReplies: (did, id) => registry.aid.replies(did, id, clock.now),
    closeAid: (did, id) => registry.aid.close(did, id),
    removeAid: (did, id) => registry.aid.remove(did, id),
    listJobs: (did) => registry.jobs.list(did, clock.now),
    addJob: (did, job) => registry.jobs.add(did, job, clock.now),
    removeJob: (did, id) => registry.jobs.remove(did, id),
    listStories: (did) => registry.stories.list(did),
    addStory: (did, story) => registry.stories.add(did, story, clock.now),
    thankStory: (did, id, thanks) => registry.stories.thank(did, id, thanks),
    removeStory: (did, id) => registry.stories.remove(did, id),
    listSkills: (did) => registry.skills.list(did),
    addSkill: (did, skill) => registry.skills.add(did, skill, clock.now),
    replySkill: (did, id, note) => registry.skills.reply(did, id, note, clock.now),
    skillReplies: (did, id) => registry.skills.replies(did, id),
    removeSkill: (did, id) => registry.skills.remove(did, id),
  };
  const namespace = { idFromName: () => 'registry', get: () => api };
  return { registry, clock, REGISTRY: namespace as unknown as Env['REGISTRY'] };
}
