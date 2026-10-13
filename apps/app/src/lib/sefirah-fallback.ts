import { isSealedObject, isSealedObjectId, type SealedObject } from '@tero/crypto';
import type { Carrier, Receipt } from './sefirah-outbox';

export class FallbackError extends Error {
  constructor(
    readonly reason: 'http' | 'network' | 'cancelled' | 'timeout' | 'invalid_response',
    readonly status = 0,
  ) {
    super(`Sefirah fallback: ${reason}${status ? ` (${status})` : ''}`);
  }
}

const responseLimit = 70 * 1024;
const timeoutMs = 30_000;

/** Explicit fallback only. Never use this HTTP adapter for member peer addresses. */
export function sefirahFallback(
  base: string,
  token: string,
  fetcher: typeof fetch = globalThis.fetch,
  now = Date.now,
): Carrier & { get: (id: string, signal: AbortSignal) => Promise<SealedObject> } {
  // Empty base is the web app's existing same-origin API. Native development may
  // use loopback HTTP; deployed origins require TLS. No arbitrary URL from a peer.
  if (base !== '') {
    const url = new URL(base);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/' ||
      (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
    ) {
      throw new Error('invalid fallback origin');
    }
    base = url.origin;
  }
  if (!token) throw new Error('fallback session required');

  async function request(id: string, signal: AbortSignal, object?: SealedObject): Promise<unknown> {
    if (!isSealedObjectId(id)) throw new Error('invalid object id');
    if (signal.aborted) throw new FallbackError('cancelled');
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal.addEventListener('abort', cancel, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await fetcher(`${base}/api/sefirah/objects/${id}`, {
        method: object ? 'PUT' : 'GET',
        headers: {
          authorization: `Bearer ${token}`,
          ...(object ? { 'content-type': 'application/json' } : {}),
        },
        body: object ? JSON.stringify(object) : undefined,
        signal: controller.signal,
        redirect: 'error',
        credentials: 'omit',
        cache: 'no-store',
      });
      if (!response.ok) throw new FallbackError('http', response.status);
      if (
        !response.headers.get('content-type')?.toLowerCase().startsWith('application/json') ||
        !response.body
      ) {
        throw new FallbackError('invalid_response');
      }
      reader = response.body.getReader();
      const bytes = new Uint8Array(responseLimit);
      let length = 0;
      while (true) {
        const next = await reader.read();
        if (controller.signal.aborted) throw new FallbackError(timedOut ? 'timeout' : 'cancelled');
        if (next.done) break;
        if (length + next.value.byteLength > responseLimit)
          throw new FallbackError('invalid_response');
        bytes.set(next.value, length);
        length += next.value.byteLength;
      }
      try {
        return JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length)),
        );
      } catch {
        throw new FallbackError('invalid_response');
      }
    } catch (error) {
      if (timedOut) throw new FallbackError('timeout');
      if (signal.aborted) throw new FallbackError('cancelled');
      if (error instanceof FallbackError) throw error;
      throw new FallbackError('network');
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      if (reader) {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      controller.abort();
    }
  }

  return {
    route: 'cloudflare',
    async put(object, signal) {
      if (!isSealedObject(object) || object.expiresAt <= now()) throw new Error('invalid object');
      const result = await request(object.id, signal, object);
      const r = result as Receipt | null;
      if (
        !r ||
        typeof r !== 'object' ||
        Object.keys(r).length !== 3 ||
        r.id !== object.id ||
        r.expiresAt !== object.expiresAt ||
        !Number.isSafeInteger(r.storedAt) ||
        r.storedAt <= 0 ||
        r.storedAt >= r.expiresAt ||
        object.expiresAt <= now()
      )
        throw new FallbackError('invalid_response');
      return r;
    },
    async get(id, signal) {
      const object = await request(id, signal);
      if (!isSealedObject(object) || object.id !== id || object.expiresAt <= now()) {
        throw new FallbackError('invalid_response');
      }
      // The recipient must still decrypt and verify the expected author with openPost.
      return object;
    },
  };
}
