import { DurableObject } from 'cloudflare:workers';
import type { SealedObject } from '@tero/crypto';
import type { Env } from './index';
import { FallbackStore } from './fallback-store';

/** Opaque development storage only. It is not a membership or governance authority. */
export class FallbackObject extends DurableObject<Env> {
  private readonly store: FallbackStore;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.store = new FallbackStore(ctx.storage.sql, env.AUTH_SECRET ?? '');
  }

  getObject(id: string) {
    return this.store.get(id, Date.now());
  }

  putObject(did: string, object: SealedObject) {
    // Explicit transaction also protects against a later synchronous write throwing.
    return this.ctx.storage.transactionSync(() => this.store.put(did, object, Date.now()));
  }
}
