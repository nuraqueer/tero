import { DurableObject } from 'cloudflare:workers';
import type { CreateCardRequest } from '@tero/protocol';
import type { Env } from './index';
import { Registry } from './registry';

/** One Durable Object holds the registry. Phase 1 is small enough for one. */
export class RegistryObject extends DurableObject<Env> {
  private readonly registry: Registry;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.registry = new Registry(ctx.storage.sql, env.FOUNDER_DID);
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
}
