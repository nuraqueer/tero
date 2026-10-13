import { isSealedObject, isSealedObjectId } from '@tero/crypto';
import type { Env, RegistryApi } from './index';
import { fallbackBucket } from './fallback-store';

const bodyLimit = 70 * 1024;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/** Count actual bytes, not the caller's Content-Length. */
async function readBody(request: Request): Promise<{ value?: unknown; status?: number }> {
  const reader = request.body?.getReader();
  if (!reader) return { status: 400 };
  const bytes = new Uint8Array(bodyLimit);
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      if (length + next.value.byteLength > bodyLimit) {
        await reader.cancel();
        return { status: 413 };
      }
      bytes.set(next.value, length);
      length += next.value.byteLength;
    }
    return {
      value: JSON.parse(
        new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(
          bytes.subarray(0, length),
        ),
      ),
    };
  } catch {
    return { status: 400 };
  } finally {
    reader.releaseLock();
  }
}

export async function handleFallback(
  request: Request,
  path: string,
  did: string,
  env: Env,
  registry: RegistryApi,
): Promise<Response> {
  if (env.SEFIRAH_EXPERIMENTAL !== 'enabled' || !env.SEFIRAH_FALLBACK) {
    return json({ error: 'not_configured' }, 503);
  }
  const match = path.match(/^\/api\/sefirah\/objects\/([^/]+)$/);
  if (!match || !isSealedObjectId(match[1])) return json({ error: 'bad_request' }, 400);
  if (request.method !== 'GET' && request.method !== 'PUT') {
    return json({ error: 'method_not_allowed' }, 405);
  }
  // Transitional admission check, deliberately not a distributed membership proof.
  const id = match[1];
  let store;
  try {
    if (!(await registry.member(did))) return json({ error: 'not_member' }, 403);
    store = env.SEFIRAH_FALLBACK.getByName(fallbackBucket(id));
  } catch {
    return json({ error: 'unavailable' }, 503);
  }
  if (request.method === 'GET') {
    try {
      const object = await store.getObject(id);
      return object ? json(object) : json({ error: 'not_found' }, 404);
    } catch {
      return json({ error: 'unavailable' }, 503);
    }
  }
  const body = await readBody(request);
  if (body.status) return json({ error: 'bad_request' }, body.status);
  if (!isSealedObject(body.value) || body.value.id !== id) {
    return json({ error: 'bad_request' }, 400);
  }
  try {
    const result = await store.putObject(did, body.value);
    if (!result.ok) {
      const status = { bad_request: 400, rate_limited: 429, capacity: 503 }[result.error];
      return json({ error: result.error }, status);
    }
    return json({ id: result.id, storedAt: result.storedAt, expiresAt: result.expiresAt });
  } catch {
    return json({ error: 'unavailable' }, 503);
  }
}
