import { DurableObject } from 'cloudflare:workers';
import type {
  CreateCardRequest,
  DirectoryPart,
  NewAidPost,
  NewJob,
  NewPlace,
  NewSkill,
  NewStory,
} from '@tero/protocol';
import type { Env } from './index';
import { Registry } from './registry';

/** One Durable Object holds the registry. Phase 1 is small enough for one. */
export class RegistryObject extends DurableObject<Env> {
  private readonly registry: Registry;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.registry = new Registry(ctx.storage.sql, env.FOUNDER_DID, undefined, env.AUTH_SECRET);
  }

  member(did: string) {
    return this.registry.member(did, Date.now());
  }
  stats() {
    return this.registry.stats(Date.now());
  }
  founderSeatOpen() {
    return this.registry.founderSeatOpen();
  }
  claimFounder(did: string) {
    return this.registry.claimFounder(did, Date.now());
  }
  listCards(inviter: string) {
    return this.registry.listCards(inviter, Date.now());
  }
  createCard(inviter: string, card: CreateCardRequest) {
    return this.registry.createCard(inviter, card, Date.now());
  }
  claimCard(claimer: string, id: string) {
    return this.registry.claimCard(claimer, id, Date.now());
  }
  approveCard(inviter: string, id: string, claimer: string) {
    return this.registry.approveCard(inviter, id, claimer, Date.now());
  }
  destroyCard(inviter: string, id: string) {
    return this.registry.destroyCard(inviter, id);
  }
  listPlaces(did: string, part: DirectoryPart) {
    return this.registry.listPlaces(did, part, Date.now());
  }
  addPlace(did: string, place: NewPlace) {
    return this.registry.addPlace(did, place, Date.now());
  }
  vouchPlace(did: string, id: string, vouch: boolean) {
    return this.registry.vouchPlace(did, id, vouch, Date.now());
  }
  removePlace(did: string, id: string) {
    return this.registry.removePlace(did, id, Date.now());
  }
  listAid(did: string) {
    return this.registry.aid.list(did, Date.now());
  }
  addAid(did: string, post: NewAidPost) {
    return this.registry.aid.add(did, post, Date.now());
  }
  replyAid(did: string, id: string, note: string) {
    return this.registry.aid.reply(did, id, note, Date.now());
  }
  aidReplies(did: string, id: string) {
    return this.registry.aid.replies(did, id, Date.now());
  }
  closeAid(did: string, id: string) {
    return this.registry.aid.close(did, id);
  }
  removeAid(did: string, id: string) {
    return this.registry.aid.remove(did, id);
  }
  listJobs(did: string) {
    return this.registry.jobs.list(did, Date.now());
  }
  addJob(did: string, job: NewJob) {
    return this.registry.jobs.add(did, job, Date.now());
  }
  removeJob(did: string, id: string) {
    return this.registry.jobs.remove(did, id);
  }
  listStories(did: string) {
    return this.registry.stories.list(did);
  }
  addStory(did: string, story: NewStory) {
    return this.registry.stories.add(did, story, Date.now());
  }
  thankStory(did: string, id: string, thanks: boolean) {
    return this.registry.stories.thank(did, id, thanks);
  }
  removeStory(did: string, id: string) {
    return this.registry.stories.remove(did, id);
  }
  listSkills(did: string) {
    return this.registry.skills.list(did);
  }
  addSkill(did: string, skill: NewSkill) {
    return this.registry.skills.add(did, skill, Date.now());
  }
  replySkill(did: string, id: string, note: string) {
    return this.registry.skills.reply(did, id, note, Date.now());
  }
  skillReplies(did: string, id: string) {
    return this.registry.skills.replies(did, id);
  }
  removeSkill(did: string, id: string) {
    return this.registry.skills.remove(did, id);
  }
}
