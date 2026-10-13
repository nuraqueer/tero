import {
  bytesToBase64Url,
  identityFromSeed,
  openPost,
  randomBytes,
  sealPost,
  sign,
} from '@tero/crypto';
import { signInMessage } from '@tero/protocol';
import { describe, expect, it } from 'vitest';
import { createChallenge, signIn } from './auth';
import { FallbackStore, fallbackLimits } from './fallback-store';
import worker, { securityHeaders, type Env } from './index';
import { memorySql, testRegistry } from './test-registry';

const alice = identityFromSeed(new Uint8Array(64).fill(11));
const bob = identityFromSeed(new Uint8Array(64).fill(12));
const stranger = identityFromSeed(new Uint8Array(64).fill(13));
const secret = 'test-only-secret-01234567890123456789';

async function world() {
  const clock = { now: Date.now() };
  const reg = testRegistry(alice.did, clock);
  const card = {
    id: bytesToBase64Url(randomBytes(32)),
    nonce: bytesToBase64Url(randomBytes(16)),
    type: 'member' as const,
  };
  reg.registry.createCard(alice.did, card, clock.now);
  reg.registry.claimCard(bob.did, card.id, clock.now);
  reg.registry.approveCard(alice.did, card.id, bob.did, clock.now);
  const buckets = new Map<string, { sql: ReturnType<typeof memorySql>; store: FallbackStore }>();
  const namespace = {
    getByName(name: string) {
      let bucket = buckets.get(name);
      if (!bucket) {
        const sql = memorySql();
        bucket = { sql, store: new FallbackStore(sql, secret) };
        buckets.set(name, bucket);
      }
      return {
        getObject: (id: string) => bucket!.store.get(id, clock.now),
        putObject: (did: string, object: unknown) => bucket!.store.put(did, object, clock.now),
      };
    },
  };
  const env: Env = {
    AUTH_SECRET: secret,
    REGISTRY: reg.REGISTRY,
    SEFIRAH_EXPERIMENTAL: 'enabled',
    SEFIRAH_FALLBACK: namespace as unknown as Env['SEFIRAH_FALLBACK'],
  };
  async function session(identity: typeof alice) {
    const { challenge } = await createChallenge(secret);
    const result = await signIn(secret, {
      did: identity.did,
      challenge,
      signature: bytesToBase64Url(sign(signInMessage(challenge), identity.secretKey)),
    });
    if (!result.ok) throw new Error('test sign in failed');
    return { authorization: `Bearer ${result.token}` };
  }
  const call = (id: string, headers: HeadersInit, method = 'GET', body?: unknown) =>
    worker.fetch(
      new Request(`https://tero.pherus.org/api/sefirah/objects/${id}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      env,
    );
  return { clock, env, buckets, call, session };
}

describe('encrypted fallback API', () => {
  it('delivers to a later reader after sender departure and store reconstruction', async () => {
    const w = await world();
    const key = randomBytes(32);
    const object = sealPost(key, alice.secretKey, 'A post for Bob', w.clock.now + 60_000);
    const sent = await w.call(object.id, await w.session(alice), 'PUT', object);
    expect(sent.status).toBe(200);
    const receipt = await sent.json();
    expect(receipt).toMatchObject({
      id: object.id,
      storedAt: w.clock.now,
      expiresAt: object.expiresAt,
    });

    // Discard the sender session. Reconstruct storage service instances, keeping SQLite.
    for (const bucket of w.buckets.values()) bucket.store = new FallbackStore(bucket.sql, secret);
    w.clock.now += 1000;
    const bobHeaders = await w.session(bob);
    for (let n = 0; n < 2; n++) {
      const received = await w.call(object.id, bobHeaders);
      expect(received.status).toBe(200);
      expect(openPost(key, await received.json(), alice.did, w.clock.now)).toEqual({
        author: alice.did,
        text: 'A post for Bob',
      });
      expect(received.headers.get('cache-control')).toBe('no-store');
      for (const [name, value] of Object.entries(securityHeaders))
        expect(received.headers.get(name)).toBe(value);
    }
    const retry = await w.call(object.id, await w.session(alice), 'PUT', object);
    expect(await retry.json()).toEqual(receipt);
    w.clock.now = object.expiresAt;
    expect((await w.call(object.id, bobHeaders)).status).toBe(404);
  });

  it('requires explicit enablement, authentication, and current membership', async () => {
    const w = await world();
    const object = sealPost(randomBytes(32), alice.secretKey, 'Hello', w.clock.now + 60_000);
    expect((await w.call(object.id, {})).status).toBe(401);
    expect((await w.call(object.id, await w.session(stranger))).status).toBe(403);
    delete w.env.SEFIRAH_EXPERIMENTAL;
    expect((await w.call(object.id, await w.session(alice), 'PUT', object)).status).toBe(503);
    expect(w.buckets.size).toBe(0);
  });

  it('rejects malformed objects, methods, oversized bodies, and false locators', async () => {
    const w = await world();
    const headers = await w.session(alice);
    const object = sealPost(randomBytes(32), alice.secretKey, 'Hello', w.clock.now + 60_000);
    expect((await w.call('bad-id', headers)).status).toBe(400);
    expect((await w.call(object.id, headers, 'DELETE')).status).toBe(405);
    expect(
      (await w.call(object.id, headers, 'PUT', { ...object, expiresAt: object.expiresAt + 1 }))
        .status,
    ).toBe(400);
    expect((await w.call('A'.repeat(43), headers, 'PUT', object)).status).toBe(400);
    expect((await w.call(object.id, headers, 'PUT', { value: 'x'.repeat(80 * 1024) })).status).toBe(
      413,
    );
    expect((await w.call(object.id, headers)).status).toBe(404);
  });

  it('returns unavailable rather than a storage receipt when the carrier fails', async () => {
    const w = await world();
    const object = sealPost(randomBytes(32), alice.secretKey, 'Hello', w.clock.now + 60_000);
    w.env.SEFIRAH_FALLBACK = {
      getByName: () => ({
        getObject: () => {
          throw new Error('unavailable');
        },
        putObject: () => {
          throw new Error('unavailable');
        },
      }),
    } as unknown as Env['SEFIRAH_FALLBACK'];
    expect((await w.call(object.id, await w.session(alice), 'PUT', object)).status).toBe(503);
    expect((await w.call(object.id, await w.session(bob))).status).toBe(503);
  });
});

describe('fallback SQLite bounds', () => {
  const now = 1_800_000_000_000;
  const make = (expiresAt = now + 60_000, size = 1) =>
    sealPost(randomBytes(32), alice.secretKey, 'x'.repeat(size), expiresAt);

  it('rejects past and excessive retention, without saving', () => {
    const sql = memorySql();
    const store = new FallbackStore(sql, secret);
    expect(store.put(alice.did, make(now), now)).toEqual({ ok: false, error: 'bad_request' });
    expect(store.put(alice.did, make(now + fallbackLimits.maxRetentionMs + 1), now)).toEqual({
      ok: false,
      error: 'bad_request',
    });
    expect(sql.exec('SELECT * FROM fallback_objects').toArray()).toEqual([]);
  });

  it('counts new objects rather than retries, and expiry does not reset daily quotas', () => {
    const store = new FallbackStore(memorySql(), secret);
    const first = make(now + 1);
    const receipt = store.put(alice.did, first, now);
    for (let n = 0; n < 20; n++) expect(store.put(alice.did, first, now)).toEqual(receipt);
    for (let n = 1; n < 10; n++) expect(store.put(alice.did, make(now + 1), now).ok).toBe(true);
    expect(store.put(alice.did, make(), now + 2)).toEqual({ ok: false, error: 'rate_limited' });
    const later = now + 24 * 60 * 60 * 1000;
    expect(store.put(alice.did, make(later + 1000), later).ok).toBe(true);
  });

  it('refuses byte exhaustion without evicting a live object', () => {
    const store = new FallbackStore(memorySql(), secret);
    const first = make(now + 60_000, 32 * 1024);
    expect(store.put('owner0', first, now).ok).toBe(true);
    for (let n = 1; n < 100; n++) {
      const result = store.put(`owner${n}`, make(now + 60_000, 32 * 1024), now);
      if (!result.ok) {
        expect(result.error).toBe('capacity');
        expect(store.get(first.id, now)).toEqual(first);
        return;
      }
    }
    throw new Error('capacity was not enforced');
  });

  it('does not store author identity or readable content in object rows', () => {
    const sql = memorySql();
    const store = new FallbackStore(sql, secret);
    const object = sealPost(randomBytes(32), alice.secretKey, 'Private content', now + 60_000);
    store.put(alice.did, object, now);
    const stored = JSON.stringify(sql.exec('SELECT * FROM fallback_objects').toArray());
    expect(stored).not.toContain(alice.did);
    expect(stored).not.toContain('Private content');
  });

  it('bounds live object count independently of byte usage and reclaims expired capacity', () => {
    const store = new FallbackStore(memorySql(), secret);
    for (let n = 0; n < fallbackLimits.bucketObjects; n++) {
      expect(store.put(`owner${n}`, make(now + 1), now).ok).toBe(true);
    }
    expect(store.put('new-owner', make(), now)).toEqual({ ok: false, error: 'capacity' });
    expect(store.put('new-owner', make(), now + 2).ok).toBe(true);
  });

  it('bounds quota metadata even when old objects have expired', () => {
    const sql = memorySql();
    const store = new FallbackStore(sql, secret);
    const day = Math.floor(now / (24 * 60 * 60 * 1000));
    for (let n = 0; n < fallbackLimits.quotaRows; n++) {
      sql.exec(
        'INSERT INTO fallback_quotas (owner, day, count) VALUES (?, ?, 1)',
        `other${n}`,
        day,
      );
    }
    const object = make();
    expect(store.put('new-owner', object, now)).toEqual({ ok: false, error: 'capacity' });
    expect(store.get(object.id, now)).toBeNull();
  });
});
