import { cardIdFromToken } from '@tero/crypto';
import {
  isApproveCardRequest,
  isCardId,
  isClaimCardRequest,
  isCreateCardRequest,
  isSignInRequest,
  type ApiErrorCode,
  type FounderSeatResponse,
  type MeResponse,
} from '@tero/protocol';
import { createChallenge, sessionDid, signIn } from './auth';
import type { RegistryObject } from './registry-object';

export interface Env {
  /** The exported web app (apps/app/dist). Absent in unit tests. */
  ASSETS?: Fetcher;
  /** Signs challenges and session tokens. Set with `wrangler secret put AUTH_SECRET`. */
  AUTH_SECRET?: string;
  /** Members and Tero cards. */
  REGISTRY?: DurableObjectNamespace<RegistryObject>;
  /** The Fool's did:key, so the first member can issue the first cards. */
  FOUNDER_DID?: string;
}

type Async<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R> | R
    : never;
};

/** The registry calls the Worker makes, whether to the Durable Object or a test double. */
export type RegistryApi = Async<
  Pick<
    RegistryObject,
    | 'member'
    | 'founderSeatOpen'
    | 'claimFounder'
    | 'listCards'
    | 'createCard'
    | 'claimCard'
    | 'approveCard'
    | 'destroyCard'
  >
>;

/** Headers added to every response. */
export const securityHeaders: Record<string, string> = {
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  // Camera for scanning Tero cards and microphone for Spaces; nothing else.
  'permissions-policy': 'camera=(self), microphone=(self), geolocation=(), interest-cohort=()',
};

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(data: unknown, status = 200): Response {
  return withSecurityHeaders(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    }),
  );
}

const error = (code: ApiErrorCode, status: number) => json({ error: code }, status);

const statusFor: Partial<Record<ApiErrorCode, number>> = {
  founder_taken: 409,
  not_member: 403,
  already_member: 409,
  card_unavailable: 410,
  card_limit: 429,
  conflict: 409,
  not_found: 404,
};

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function registry(env: Env): RegistryApi | null {
  if (!env.REGISTRY) return null;
  return env.REGISTRY.get(env.REGISTRY.idFromName('registry')) as unknown as RegistryApi;
}

async function handleAuth(request: Request, path: string, secret: string): Promise<Response> {
  if (request.method !== 'POST') return error('method_not_allowed', 405);

  if (path === '/api/auth/challenge') return json(await createChallenge(secret));

  // /api/auth/session
  const body = await readJson(request);
  if (!isSignInRequest(body)) return error('bad_request', 400);
  const result = await signIn(secret, body);
  if (!result.ok) return error(result.error, 401);
  return json({ token: result.token, expiresAt: result.expiresAt });
}

/** Routes that need a signed-in key. */
async function handleSignedIn(
  request: Request,
  path: string,
  did: string,
  reg: RegistryApi,
): Promise<Response> {
  const method = request.method;

  if (path === '/api/me') {
    if (method !== 'GET') return error('method_not_allowed', 405);
    const member = await reg.member(did);
    const me: MeResponse = { did, member: member !== null, sequence: member?.sequence ?? null };
    return json(me);
  }

  if (path === '/api/founder') {
    if (method !== 'POST') return error('method_not_allowed', 405);
    const result = await reg.claimFounder(did);
    return result.ok ? json({ sequence: result.sequence }) : error(result.error, 409);
  }

  if (path === '/api/cards') {
    if (method === 'GET') {
      if (!(await reg.member(did))) return error('not_member', 403);
      return json({ cards: await reg.listCards(did) });
    }
    if (method === 'POST') {
      const body = await readJson(request);
      if (!isCreateCardRequest(body)) return error('bad_request', 400);
      const result = await reg.createCard(did, body);
      return result.ok ? json(result.card, 201) : error(result.error, statusFor[result.error]!);
    }
    return error('method_not_allowed', 405);
  }

  if (path === '/api/cards/claim') {
    if (method !== 'POST') return error('method_not_allowed', 405);
    const body = await readJson(request);
    if (!isClaimCardRequest(body)) return error('bad_request', 400);
    const result = await reg.claimCard(did, cardIdFromToken(body.token));
    if (!result.ok) return error(result.error, statusFor[result.error]!);
    return json({ id: result.id, expiresAt: result.expiresAt });
  }

  const match = path.match(/^\/api\/cards\/([^/]+)(\/approve)?$/);
  if (match && isCardId(match[1])) {
    const id = match[1]!;
    if (match[2]) {
      if (method !== 'POST') return error('method_not_allowed', 405);
      const body = await readJson(request);
      if (!isApproveCardRequest(body)) return error('bad_request', 400);
      const result = await reg.approveCard(did, id, body.claimer);
      return result.ok
        ? json({ sequence: result.sequence })
        : error(result.error, statusFor[result.error]!);
    }
    if (method !== 'DELETE') return error('method_not_allowed', 405);
    const result = await reg.destroyCard(did, id);
    return result.ok
      ? new Response(null, { status: 204, headers: securityHeaders })
      : error(result.error, 404);
  }

  return error('not_found', 404);
}

async function handleApi(request: Request, path: string, env: Env): Promise<Response> {
  if (path === '/api/health') {
    if (request.method !== 'GET') return error('method_not_allowed', 405);
    return json({ ok: true, service: 'tero-edge' });
  }

  const known =
    path.startsWith('/api/auth/') ||
    path === '/api/me' ||
    path === '/api/founder' ||
    path.startsWith('/api/cards');
  if (!known) return error('not_found', 404);

  // A short secret would make tokens guessable; refuse to run with one.
  const secret = env.AUTH_SECRET;
  const reg = registry(env);
  if (!secret || secret.length < 32 || !reg) return error('not_configured', 503);

  if (path === '/api/founder' && request.method === 'GET') {
    const seat: FounderSeatResponse = { open: await reg.founderSeatOpen() };
    return json(seat);
  }

  if (path === '/api/auth/challenge' || path === '/api/auth/session') {
    return handleAuth(request, path, secret);
  }

  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  const did = token ? await sessionDid(secret, token) : null;
  if (!did) return error('unauthorized', 401);
  return handleSignedIn(request, path, did, reg);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, url.pathname, env);
    if (!env.ASSETS) return error('not_found', 404);

    // Every card link is served by the one card page; the app reads the token from the URL.
    if (/^\/c\/[A-Za-z0-9_-]{22}\/?$/.test(url.pathname)) {
      let page = await env.ASSETS.fetch(new Request(new URL('/c/[token]', url), request));
      // The assets layer may redirect to its own spelling of the path; follow it here so
      // the browser keeps the card link in its address bar.
      const moved = page.status >= 300 && page.status < 400 && page.headers.get('location');
      if (moved) page = await env.ASSETS.fetch(new Request(new URL(moved, url), request));
      const response = withSecurityHeaders(page);
      response.headers.set('x-robots-tag', 'noindex, nofollow');
      return response;
    }
    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<Env>;
