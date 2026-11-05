/** Minimal import shim for Node unit tests, never deployed to Cloudflare. */
export class DurableObject<Env> {
  protected readonly ctx: DurableObjectState;
  protected readonly env: Env;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}
