import { publicKeyFromDid, verifyDirectoryGrant, verifyProfileEnvelope } from '@tero/crypto';
import type { ApiErrorCode } from '@tero/protocol';
import type { RegistryApi } from './index';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
const error = (code: ApiErrorCode, status: number) => json({ error: code }, status);
async function body(request: Request): Promise<unknown> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 12 * 1024) {
        await reader.cancel();
        return null;
      }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, at);
      at += chunk.length;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
export async function handleDiscovery(
  request: Request,
  path: string,
  did: string,
  reg: RegistryApi,
): Promise<Response> {
  if (!(await reg.member(did))) return error('not_member', 403);
  let result;
  if (path === '/api/discovery/members') {
    if (request.method !== 'GET') return error('method_not_allowed', 405);
    const cursor = new URL(request.url).searchParams.get('cursor') ?? '';
    if (cursor && !publicKeyFromDid(cursor)) return error('bad_request', 400);
    result = await reg.discoveryPage(did, cursor);
  } else if (path === '/api/discovery/grant') {
    if (request.method !== 'PUT') return error('method_not_allowed', 405);
    const value = await body(request);
    if (!verifyDirectoryGrant(value)) return error('bad_request', 400);
    result = await reg.grantDirectory(did, value);
  } else if (path === '/api/discovery/handle') {
    if (request.method !== 'PUT') return error('method_not_allowed', 405);
    const value = await body(request);
    if (!value || typeof value !== 'object') return error('bad_request', 400);
    const query = value as Record<string, unknown>;
    if (
      Object.keys(query).length !== 2 ||
      typeof query.directory !== 'string' ||
      typeof query.handleTag !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(query.directory) ||
      !/^[A-Za-z0-9_-]{43}$/.test(query.handleTag)
    )
      return error('bad_request', 400);
    result = await reg.handleAvailable(did, query.directory, query.handleTag);
  } else if (path === '/api/discovery/profile') {
    if (request.method !== 'PUT') return error('method_not_allowed', 405);
    const value = await body(request);
    if (!verifyProfileEnvelope(value)) return error('bad_request', 400);
    result = await reg.saveProfile(did, value);
  } else if (path === '/api/discovery/connections') {
    if (request.method === 'GET') result = await reg.connections(did);
    else if (request.method === 'PUT') {
      const value = await body(request);
      if (!value || typeof value !== 'object') return error('bad_request', 400);
      const action = value as Record<string, unknown>;
      if (
        Object.keys(action).length !== 2 ||
        typeof action.peer !== 'string' ||
        !publicKeyFromDid(action.peer) ||
        !['request', 'accept', 'remove'].includes(String(action.action))
      )
        return error('bad_request', 400);
      result = await reg.changeConnection(
        did,
        action.peer,
        action.action as 'request' | 'accept' | 'remove',
      );
    } else return error('method_not_allowed', 405);
  } else return error('not_found', 404);
  if (!result.ok)
    return error(
      result.error,
      result.error === 'not_member' || result.error === 'not_allowed'
        ? 403
        : result.error === 'not_found'
          ? 404
          : result.error === 'capacity'
            ? 429
            : result.error === 'bad_request'
              ? 400
              : 409,
    );
  const { ok: _ok, ...data } = result;
  return json(data);
}
