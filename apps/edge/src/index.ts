export interface Env {
  /** The exported web app (apps/app/dist). Absent in unit tests. */
  ASSETS?: Fetcher;
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
      return json({ ok: true, service: 'tero-edge' });
    }

    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);

    if (env.ASSETS) return withSecurityHeaders(await env.ASSETS.fetch(request));

    return json({ error: 'not_found' }, 404);
  },
} satisfies ExportedHandler<Env>;
