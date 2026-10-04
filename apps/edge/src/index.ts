import { isSignInRequest, type ApiErrorCode } from '@tero/protocol';
import { createChallenge, sessionDid, signIn } from './auth';

export interface Env {
  /** The exported web app (apps/app/dist). Absent in unit tests. */
  ASSETS?: Fetcher;
  /** Signs challenges and session tokens. Set with `wrangler secret put AUTH_SECRET`. */
  AUTH_SECRET?: string;
}

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

async function handleAuth(request: Request, path: string, env: Env): Promise<Response> {
  // A short secret would make tokens guessable; refuse to run with one.
  const secret = env.AUTH_SECRET;
  if (!secret || secret.length < 32) return error('not_configured', 503);

  if (path === '/api/auth/challenge') {
    if (request.method !== 'POST') return error('method_not_allowed', 405);
    return json(await createChallenge(secret));
  }

  if (path === '/api/auth/session') {
    if (request.method !== 'POST') return error('method_not_allowed', 405);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return error('bad_request', 400);
    }
    if (!isSignInRequest(body)) return error('bad_request', 400);
    const result = await signIn(secret, body);
    if (!result.ok) return error(result.error, 401);
    return json({ token: result.token, expiresAt: result.expiresAt });
  }

  if (path === '/api/me') {
    if (request.method !== 'GET') return error('method_not_allowed', 405);
    const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
    const did = token ? await sessionDid(secret, token) : null;
    if (!did) return error('unauthorized', 401);
    return json({ did });
  }

  return error('not_found', 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
      return json({ ok: true, service: 'tero-edge' });
    }

    if (url.pathname.startsWith('/api/auth/') || url.pathname === '/api/me') {
      return handleAuth(request, url.pathname, env);
    }

    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);

    if (env.ASSETS) return withSecurityHeaders(await env.ASSETS.fetch(request));

    return json({ error: 'not_found' }, 404);
  },
} satisfies ExportedHandler<Env>;
