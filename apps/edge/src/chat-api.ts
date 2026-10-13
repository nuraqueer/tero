import {
  isSealedObject,
  isSealedObjectId,
  publicKeyFromDid,
  pseudonym,
  verifyDeliveryDescriptor,
  verifyChatPresence,
} from '@tero/crypto';
import type { Env, RegistryApi } from './index';
import { enqueueChatPush } from './chat-push';
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
const fail = (error: string, status: number) => json({ error }, status);
async function body(request: Request): Promise<unknown> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const data = new Uint8Array(74 * 1024);
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      if (length + part.value.length > data.length) {
        await reader.cancel();
        return null;
      }
      data.set(part.value, length);
      length += part.value.length;
    }
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(data.subarray(0, length)),
    );
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
export async function handleChat(
  request: Request,
  path: string,
  did: string,
  env: Env,
  reg: RegistryApi,
): Promise<Response> {
  if (env.SEFIRAH_EXPERIMENTAL !== 'enabled' || !env.CHAT_MAILBOX || !env.AUTH_SECRET)
    return fail('unavailable', 503);
  const segments = path.slice('/api/chat/'.length).split('/');
  let peer: string;
  try {
    peer = decodeURIComponent(segments[0] ?? '');
  } catch {
    return fail('bad_request', 400);
  }
  const id = segments[1];
  const presence = id === 'presence';
  if (
    segments.length > 2 ||
    !publicKeyFromDid(peer) ||
    peer === did ||
    (id !== undefined && !presence && !isSealedObjectId(id))
  )
    return fail('bad_request', 400);
  if (!(await reg.member(did)) || !(await reg.member(peer))) return fail('not_member', 403);
  const connections = await reg.connections(did);
  if (
    !connections.ok ||
    !connections.connections.some((v) => v.peer === peer && v.state === 'accepted')
  )
    return fail('not_allowed', 403);
  const name = pseudonym(
    env.AUTH_SECRET,
    'private-chat-mailbox/v1',
    JSON.stringify([did, peer].sort()),
  );
  const box = env.CHAT_MAILBOX.get(env.CHAT_MAILBOX.idFromName(name));
  try {
    if (presence) {
      if (request.method === 'GET') return json({ presence: await box.getPresence(peer) });
      if (request.method !== 'PUT') return fail('method_not_allowed', 405);
      const record = await body(request);
      if (!verifyChatPresence(record, did, peer)) return fail('bad_request', 400);
      await box.setPresence(record);
      return new Response(null, { status: 204 });
    }
    if (request.method === 'GET' && id === undefined)
      return json({ packets: await box.list(did, peer) });
    if (request.method === 'GET' && id !== undefined) {
      const object = await box.get(did, peer, id);
      return object ? json(object) : fail('not_found', 404);
    }
    if (request.method === 'DELETE' && id !== undefined) {
      await box.acknowledge(did, peer, id);
      return new Response(null, { status: 204 });
    }
    if (request.method === 'PUT' && id === undefined) {
      const value = await body(request);
      if (!value || typeof value !== 'object') return fail('bad_request', 400);
      const p = value as Record<string, unknown>;
      if (
        Object.keys(p).some(
          (key) => !['descriptor', 'object', 'notify', 'notificationName'].includes(key),
        ) ||
        (p.notify !== undefined && typeof p.notify !== 'boolean') ||
        (p.notificationName !== undefined &&
          (typeof p.notificationName !== 'string' ||
            p.notificationName.length > 80 ||
            /[\u0000-\u001f\u007f-\u009f]/.test(p.notificationName))) ||
        !verifyDeliveryDescriptor(p.descriptor, Date.now()) ||
        p.descriptor.sender !== did ||
        p.descriptor.recipient !== peer ||
        (p.object !== null &&
          (!isSealedObject(p.object) ||
            p.object.id !== p.descriptor.objectId ||
            p.object.expiresAt !== p.descriptor.expiresAt))
      )
        return fail('bad_request', 400);
      const result = await box.put(did, peer, p.descriptor, p.object);
      if (result.ok && p.notify === true && p.object !== null) {
        // Push failure never changes durable message storage acknowledgement.
        await enqueueChatPush(
          env,
          peer,
          did,
          p.descriptor.objectId,
          p.descriptor.expiresAt,
          typeof p.notificationName === 'string' ? p.notificationName.trim() : undefined,
        ).catch(() => {});
      }
      return result.ok
        ? json(result)
        : fail(
            result.error,
            result.error === 'capacity' ? 429 : result.error === 'conflict' ? 409 : 400,
          );
    }
    return fail('method_not_allowed', 405);
  } catch {
    return fail('unavailable', 503);
  }
}
