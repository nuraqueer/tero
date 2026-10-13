import {
  bytesToBase64Url,
  cardIdFromToken,
  cardToken,
  createPhrase,
  deriveSecret,
  identityFromSeed,
  phraseToSeed,
  randomBytes,
  sign,
} from '@tero/crypto';
import { signInMessage, type CardSummary } from '@tero/protocol';
import { describe, expect, it } from 'vitest';
import worker, { type Env } from './index';
import { testRegistry } from './test-registry';

async function person() {
  const seed = await phraseToSeed(createPhrase());
  return { ...identityFromSeed(seed), cardSecret: deriveSecret(seed, 'cards') };
}
type Person = Awaited<ReturnType<typeof person>>;

async function world() {
  const fool = await person();
  const env: Env = {
    AUTH_SECRET: 'test-secret-0123456789abcdef0123456789',
    REGISTRY: testRegistry(fool.did).REGISTRY,
  };
  const call = (path: string, init?: RequestInit) =>
    worker.fetch(new Request(`https://tero.pherus.org${path}`, init), env);

  async function session(who: Person) {
    const challengeRes = await call('/api/auth/challenge', { method: 'POST' });
    const { challenge } = (await challengeRes.json()) as { challenge: string };
    const signature = bytesToBase64Url(sign(signInMessage(challenge), who.secretKey));
    const res = await call('/api/auth/session', {
      method: 'POST',
      body: JSON.stringify({ did: who.did, challenge, signature }),
    });
    const { token } = (await res.json()) as { token: string };
    return (path: string, method = 'GET', body?: unknown) =>
      call(path, {
        method,
        headers: { authorization: `Bearer ${token}` },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
  }

  async function makeCard(as: Awaited<ReturnType<typeof session>>, who: Person) {
    const nonce = randomBytes(16);
    const token = cardToken(who.cardSecret, nonce);
    const id = cardIdFromToken(token);
    const res = await as('/api/cards', 'POST', {
      id,
      nonce: bytesToBase64Url(nonce),
      type: 'member',
    });
    return { res, token, id };
  }

  return { fool, env, call, session, makeCard };
}

describe('Tero cards over the API', () => {
  it('takes a newcomer from scan to member', async () => {
    const { fool, session, makeCard } = await world();
    const asFool = await session(fool);
    expect(await (await asFool('/api/me')).json()).toMatchObject({ member: true, sequence: 0 });

    const { res, token, id } = await makeCard(asFool, fool);
    expect(res.status).toBe(201);
    // The server never sees the token, only its hash.
    expect(JSON.stringify(await res.json())).not.toContain(token);

    const newcomer = await person();
    const asNew = await session(newcomer);
    const claim = await asNew('/api/cards/claim', 'POST', { token, adult: true });
    expect(claim.status).toBe(200);
    expect(await claim.json()).toMatchObject({ id });

    const { cards } = (await (await asFool('/api/cards')).json()) as { cards: CardSummary[] };
    expect(cards).toMatchObject([{ id, state: 'claimed', claimer: newcomer.did }]);

    const approve = await asFool(`/api/cards/${id}/approve`, 'POST', {
      claimer: newcomer.did,
      adult: true,
    });
    expect(approve.status).toBe(200);
    expect(await (await asNew('/api/me')).json()).toMatchObject({ member: true, sequence: 9 });
    expect(await (await asFool('/api/cards')).json()).toEqual({ cards: [] });
  });

  it('turns away a second scan', async () => {
    const { fool, session, makeCard } = await world();
    const { token } = await makeCard(await session(fool), fool);
    await (
      await session(await person())
    )('/api/cards/claim', 'POST', { token, adult: true });
    const late = await (
      await session(await person())
    )('/api/cards/claim', 'POST', { token, adult: true });
    expect(late.status).toBe(410);
    expect(await late.json()).toEqual({ error: 'card_unavailable' });
  });

  it('needs the newcomer to say they are an adult, and the inviter to confirm it', async () => {
    const { fool, session, makeCard } = await world();
    const asFool = await session(fool);
    const { token, id } = await makeCard(asFool, fool);
    const newcomer = await person();
    const asNew = await session(newcomer);
    expect((await asNew('/api/cards/claim', 'POST', { token })).status).toBe(400);
    await asNew('/api/cards/claim', 'POST', { token, adult: true });
    expect(
      (await asFool(`/api/cards/${id}/approve`, 'POST', { claimer: newcomer.did })).status,
    ).toBe(400);
  });

  it('keeps cards to members', async () => {
    const { session, makeCard } = await world();
    const stranger = await person();
    const asStranger = await session(stranger);
    expect((await makeCard(asStranger, stranger)).res.status).toBe(403);
    expect((await asStranger('/api/cards')).status).toBe(403);
  });

  it('lets the inviter destroy a card', async () => {
    const { fool, session, makeCard } = await world();
    const asFool = await session(fool);
    const { token, id } = await makeCard(asFool, fool);
    expect((await asFool(`/api/cards/${id}`, 'DELETE')).status).toBe(204);
    const claim = await (
      await session(await person())
    )('/api/cards/claim', 'POST', { token, adult: true });
    expect(claim.status).toBe(410);
  });

  it('needs a session for everything about cards', async () => {
    const { call } = await world();
    expect((await call('/api/cards')).status).toBe(401);
    expect((await call('/api/cards/claim', { method: 'POST', body: '{}' })).status).toBe(401);
  });

  it('follows the assets redirect so the browser keeps the card link', async () => {
    const { env } = await world();
    const withAssets: Env = {
      ...env,
      ASSETS: {
        fetch: async (req: Request) =>
          new URL(req.url).pathname === '/c/[token]'
            ? new Response(null, { status: 307, headers: { location: '/c/%5Btoken%5D' } })
            : new Response('<html>card</html>'),
      } as unknown as Fetcher,
    };
    const res = await worker.fetch(
      new Request('https://tero.pherus.org/c/abcdefghijklmnopqrstuv'),
      withAssets,
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('<html>card</html>');
  });

  it('serves every card link from the one card page, marked noindex', async () => {
    const { env } = await world();
    const seen: string[] = [];
    const withAssets: Env = {
      ...env,
      ASSETS: {
        fetch: async (req: Request) => {
          seen.push(decodeURIComponent(new URL(req.url).pathname));
          return new Response('<html>card</html>');
        },
      } as unknown as Fetcher,
    };
    const res = await worker.fetch(
      new Request('https://tero.pherus.org/c/abcdefghijklmnopqrstuv'),
      withAssets,
    );
    expect(await res.text()).toBe('<html>card</html>');
    expect(seen).toEqual(['/c/[token]']);
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });
});

describe('status', () => {
  it('shares only membership size with admitted members', async () => {
    const { fool, session, makeCard, call } = await world();
    const asFool = await session(fool);
    expect((await call('/api/network/size')).status).toBe(401);
    const newcomer = await person();
    const asNew = await session(newcomer);
    expect((await asNew('/api/network/size')).status).toBe(403);
    const { token, id } = await makeCard(asFool, fool);
    await asNew('/api/cards/claim', 'POST', { token, adult: true });
    await asFool(`/api/cards/${id}/approve`, 'POST', { claimer: newcomer.did, adult: true });
    const response = await asNew('/api/network/size');
    const size = await response.json();
    expect(size).toEqual({ members: 2, checkedAt: expect.any(Number) });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect((await asNew('/api/network/size', 'POST')).status).toBe(405);
    expect((await asNew('/api/status')).status).toBe(403);
  });

  it('gives counts to the Fool and nobody else', async () => {
    const { fool, session } = await world();
    const asFool = await session(fool);
    const asNew = await session(await person());
    expect(await (await asFool('/api/status')).json()).toMatchObject({ members: 1, council: 1 });
    expect((await asNew('/api/status')).status).toBe(403);
  });
});
