import { DurableObject } from 'cloudflare:workers';
import type { CreateCardRequest, DirectoryPart, NewAidPost, NewPlace } from '@tero/protocol';
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
}
