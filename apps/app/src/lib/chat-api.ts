import {
  isSealedObject,
  isSealedObjectId,
  publicKeyFromDid,
  verifyDeliveryDescriptor,
  type DeliveryDescriptor,
  type SealedObject,
} from '@tero/crypto';

export type MailboxPacket = { descriptor: DeliveryDescriptor; fallback: boolean };
export class ChatTransportError extends Error {
  constructor(readonly status: number) {
    super(status ? `Chat service unavailable (${status})` : 'Chat connection unavailable');
  }
}
/** Only the configured service origin is permitted. Peer URLs never enter HTTP requests. */
export function chatApi(base: string, token: string, fetcher: typeof fetch, testing: boolean) {
  if (base) {
    const u = new URL(base);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
    const lan =
      /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/.test(
        u.hostname,
      );
    if (
      u.username ||
      u.password ||
      u.pathname !== '/' ||
      u.search ||
      u.hash ||
      (u.protocol !== 'https:' && !(u.protocol === 'http:' && (local || (testing && lan))))
    )
      throw new Error('Invalid chat service origin');
    base = u.origin;
  }
  if (!token) throw new Error('Chat session unavailable');
  async function request(
    peer: string,
    method: string,
    signal: AbortSignal,
    id?: string,
    body?: unknown,
  ): Promise<unknown> {
    if (!publicKeyFromDid(peer) || (id !== undefined && !isSealedObjectId(id)))
      throw new Error('Invalid chat target');
    if (signal.aborted) throw new Error('Chat cancelled');
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, 30_000);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await fetcher(
        `${base}/api/chat/${encodeURIComponent(peer)}${id ? `/${id}` : ''}`,
        {
          method,
          headers: {
            authorization: `Bearer ${token}`,
            ...(body ? { 'content-type': 'application/json' } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          credentials: 'omit',
          redirect: 'error',
          cache: 'no-store',
        },
      );
      if (!response.ok) throw new ChatTransportError(response.status);
      if (response.status === 204) return null;
      if (!response.headers.get('content-type')?.startsWith('application/json') || !response.body)
        throw new ChatTransportError(0);
      reader = response.body.getReader();
      const bytes = new Uint8Array(256 * 1024);
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (controller.signal.aborted) throw new Error('Chat cancelled');
        if (part.done) break;
        if (size + part.value.length > bytes.length) throw new ChatTransportError(0);
        bytes.set(part.value, size);
        size += part.value.length;
      }
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, size)));
    } catch (error) {
      if (error instanceof ChatTransportError) throw error;
      throw new ChatTransportError(0);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      if (reader) {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      controller.abort();
    }
  }
  return {
    async list(peer: string, signal: AbortSignal): Promise<MailboxPacket[]> {
      const data = (await request(peer, 'GET', signal)) as { packets?: unknown } | null;
      if (
        !data ||
        !Array.isArray(data.packets) ||
        data.packets.length > 32 ||
        data.packets.some(
          (p: MailboxPacket) =>
            !p ||
            !verifyDeliveryDescriptor(p.descriptor, Date.now()) ||
            p.descriptor.sender !== peer ||
            typeof p.fallback !== 'boolean',
        )
      )
        throw new ChatTransportError(0);
      return data.packets as MailboxPacket[];
    },
    async publish(
      peer: string,
      descriptor: DeliveryDescriptor,
      object: SealedObject | null,
      signal: AbortSignal,
      notify = false,
      notificationName?: string,
    ) {
      const result = (await request(peer, 'PUT', signal, undefined, {
        descriptor,
        object,
        notify,
        ...(notificationName ? { notificationName } : {}),
      })) as {
        ok?: boolean;
        storedAt?: unknown;
        expiresAt?: unknown;
      } | null;
      if (
        !result ||
        result.ok !== true ||
        !Number.isSafeInteger(result.storedAt) ||
        (result.storedAt as number) <= 0 ||
        result.expiresAt !== descriptor.expiresAt
      )
        throw new ChatTransportError(0);
    },
    async get(peer: string, id: string, signal: AbortSignal): Promise<SealedObject> {
      const object = await request(peer, 'GET', signal, id);
      if (!isSealedObject(object) || object.id !== id || object.expiresAt <= Date.now())
        throw new ChatTransportError(0);
      return object;
    },
    async acknowledge(peer: string, id: string, signal: AbortSignal) {
      await request(peer, 'DELETE', signal, id);
    },
  };
}
export type ChatApi = ReturnType<typeof chatApi>;
