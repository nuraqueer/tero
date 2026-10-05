import { describe, expect, it } from 'vitest';
import worker, { type Env } from './index';
import { testRegistry } from './test-registry';

const fool = 'did:key:fool';

describe('journeys', () => {
  it('keeps one sealed box per member, with versions', () => {
    const { registry, clock } = testRegistry(fool);
    const j = registry.journeys;
    expect(j.get(fool)).toEqual({ ok: true, box: null, version: 0 });
    expect(j.save(fool, 'box1', 0, clock.now)).toEqual({ ok: true, version: 1 });
    expect(j.get(fool)).toEqual({ ok: true, box: 'box1', version: 1 });
    // A second device that still thinks it's version 0 can't overwrite.
    expect(j.save(fool, 'stale', 0, clock.now)).toEqual({ ok: false, error: 'conflict' });
    expect(j.save(fool, 'box2', 1, clock.now)).toEqual({ ok: true, version: 2 });
    expect(j.save(fool, 'stale', 1, clock.now)).toEqual({ ok: false, error: 'conflict' });
    expect(j.get(fool)).toEqual({ ok: true, box: 'box2', version: 2 });
  });

  it('is for members only, and each member sees only their own', () => {
    const { registry, clock } = testRegistry(fool);
    expect(registry.journeys.get('did:key:stranger')).toEqual({ ok: false, error: 'not_member' });
    expect(registry.journeys.save('did:key:stranger', 'x', 0, clock.now).ok).toBe(false);
  });

  it('needs a session at the API', async () => {
    const env: Env = {
      AUTH_SECRET: 'test-secret-0123456789abcdef0123456789',
      REGISTRY: testRegistry(fool).REGISTRY,
    };
    const res = await worker.fetch(new Request('https://tero.pherus.org/api/journeys'), env);
    expect(res.status).toBe(401);
  });
});
