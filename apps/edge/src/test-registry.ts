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
    listCards: (inviter) => registry.listCards(inviter, clock.now),
    createCard: (inviter, card) => registry.createCard(inviter, card, clock.now),
    claimCard: (claimer, id) => registry.claimCard(claimer, id, clock.now),
    approveCard: (inviter, id, claimer) => registry.approveCard(inviter, id, claimer, clock.now),
    destroyCard: (inviter, id) => registry.destroyCard(inviter, id),
  };
  const namespace = { idFromName: () => 'registry', get: () => api };
  return { registry, clock, REGISTRY: namespace as unknown as Env['REGISTRY'] };
}
