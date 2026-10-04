import { bytesToBase64Url, createPhrase, identityFromSeed, phraseToSeed, sign } from '@tero/crypto';
import { challengeTtlMs, sessionTtlMs, signInMessage } from '@tero/protocol';
import { describe, expect, it } from 'vitest';
import worker, { type Env } from './index';

const env: Env = { AUTH_SECRET: 'test-secret-0123456789abcdef0123456789' };

const call = (path: string, init?: RequestInit, e: Env = env) =>
  worker.fetch(new Request(`https://tero.pherus.org${path}`, init), e);

const post = (path: string, body?: unknown, e: Env = env) =>
  call(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }, e);

async function newIdentity() {
  return identityFromSeed(await phraseToSeed(createPhrase()));
}

async function signInAs(identity: Awaited<ReturnType<typeof newIdentity>>) {
  const { challenge } = (await (await post('/api/auth/challenge')).json()) as { challenge: string };
  const signature = bytesToBase64Url(sign(signInMessage(challenge), identity.secretKey));
  return post('/api/auth/session', { did: identity.did, challenge, signature });
}

describe('signing in', () => {
  it('gives a session to whoever holds the identity key', async () => {
    const identity = await newIdentity();
    const res = await signInAs(identity);
    expect(res.status).toBe(200);
    const { token, expiresAt } = (await res.json()) as { token: string; expiresAt: number };
    expect(expiresAt).toBeGreaterThan(Date.now() + sessionTtlMs - 60_000);

    const me = await call('/api/me', { headers: { authorization: `Bearer ${token}` } });
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({ did: identity.did });
  });

  it('refuses a signature from another key', async () => {
    const identity = await newIdentity();
    const other = await newIdentity();
    const { challenge } = (await (await post('/api/auth/challenge')).json()) as {
      challenge: string;
    };
    const signature = bytesToBase64Url(sign(signInMessage(challenge), other.secretKey));
    const res = await post('/api/auth/session', { did: identity.did, challenge, signature });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid_signature' });
  });

  it('refuses a challenge the server did not make', async () => {
    const identity = await newIdentity();
    const challenge = `c1.forged.${Date.now() + challengeTtlMs}.AAAA`;
    const signature = bytesToBase64Url(sign(signInMessage(challenge), identity.secretKey));
    const res = await post('/api/auth/session', { did: identity.did, challenge, signature });
    expect(res.status).toBe(401);
  });

  it('refuses a challenge made with another secret', async () => {
    const identity = await newIdentity();
    const otherEnv: Env = { AUTH_SECRET: 'another-secret-0123456789abcdef01234' };
    const { challenge } = (await (
      await post('/api/auth/challenge', undefined, otherEnv)
    ).json()) as {
      challenge: string;
    };
    const signature = bytesToBase64Url(sign(signInMessage(challenge), identity.secretKey));
    expect(
      (await post('/api/auth/session', { did: identity.did, challenge, signature })).status,
    ).toBe(401);
  });

  it('refuses an expired challenge', async () => {
    const { createChallenge, signIn } = await import('./auth');
    const identity = await newIdentity();
    const past = Date.now() - challengeTtlMs - 1000;
    const { challenge } = await createChallenge(env.AUTH_SECRET!, past);
    const signature = bytesToBase64Url(sign(signInMessage(challenge), identity.secretKey));
    expect(await signIn(env.AUTH_SECRET!, { did: identity.did, challenge, signature })).toEqual({
      ok: false,
      error: 'expired',
    });
  });

  it('refuses malformed requests', async () => {
    expect((await post('/api/auth/session', { did: 'x' })).status).toBe(400);
    const res = await call('/api/auth/session', { method: 'POST', body: 'not json' });
    expect(res.status).toBe(400);
    expect((await call('/api/auth/challenge')).status).toBe(405);
  });

  it('refuses missing, forged and expired sessions', async () => {
    const { sessionDid } = await import('./auth');
    expect((await call('/api/me')).status).toBe(401);
    const forged = `s1.did:key:z6Mkabc.${Date.now() + 10_000}.AAAA`;
    expect((await call('/api/me', { headers: { authorization: `Bearer ${forged}` } })).status).toBe(
      401,
    );

    const identity = await newIdentity();
    const { token } = (await (await signInAs(identity)).json()) as { token: string };
    expect(await sessionDid(env.AUTH_SECRET!, token, Date.now() + sessionTtlMs + 1000)).toBeNull();
    // The token can't be moved to another identity.
    const moved = token.replace(identity.did, (await newIdentity()).did);
    expect(await sessionDid(env.AUTH_SECRET!, moved)).toBeNull();
  });

  it('does not run without a strong secret', async () => {
    expect((await post('/api/auth/challenge', undefined, {})).status).toBe(503);
    expect((await post('/api/auth/challenge', undefined, { AUTH_SECRET: 'short' })).status).toBe(
      503,
    );
  });
});
