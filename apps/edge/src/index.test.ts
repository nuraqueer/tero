import { describe, expect, it } from 'vitest';
import worker, { securityHeaders, type Env } from './index';

const call = (path: string, init?: RequestInit, env: Env = {}) =>
  worker.fetch(new Request(`https://tero.pherus.org${path}`, init), env);

describe('edge worker', () => {
  it('answers the health check', async () => {
    const res = await call('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, service: 'tero-edge' });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects other methods on the health check', async () => {
    expect((await call('/api/health', { method: 'POST' })).status).toBe(405);
  });

  it('returns 404 for unknown API routes', async () => {
    expect((await call('/api/nothing')).status).toBe(404);
  });

  it('adds security headers to every response', async () => {
    const res = await call('/api/health');
    for (const [name, value] of Object.entries(securityHeaders)) {
      expect(res.headers.get(name)).toBe(value);
    }
  });

  it('serves the web app through the assets binding', async () => {
    const env: Env = {
      ASSETS: { fetch: async () => new Response('<html>Tero</html>') } as unknown as Fetcher,
    };
    const res = await call('/', undefined, env);
    expect(await res.text()).toBe('<html>Tero</html>');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });
});

describe('one address', () => {
  it('forwards the workers.dev address to tero.pherus.org, keeping the path', async () => {
    const res = await worker.fetch(
      new Request('https://tero.pherus.workers.dev/c/abc?x=1'),
      {} as Env,
    );
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('https://tero.pherus.org/c/abc?x=1');
  });
});
