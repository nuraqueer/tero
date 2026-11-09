import { sefirahTransportCall, type TransportResult } from './sefirah-transport';

function token(bytes: number): string {
  const random = new Uint8Array(bytes);
  crypto.getRandomValues(random);
  const binary = String.fromCharCode(...random);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function requireSuccess(reply: TransportResult): unknown {
  if (!reply.ok) throw new Error(`Sefirah transport: ${reply.error}`);
  return reply.value;
}

/** Owns one volatile Tor session. Contact authenticity and MLS remain separate.
 * No user identity keys, recovery phrases, or message plaintext enter this API.
 */
export class SefirahSession {
  private readonly handle = token(16);
  private readonly capability = token(32);
  private readonly requests = new Set<string>();
  private closed = false;
  private address: string | null = null;
  private starting: Promise<string> | null = null;

  async start(): Promise<{ onion: string; capability: string }> {
    if (this.closed) throw new Error('Sefirah session closed');
    if (this.address) return { onion: this.address, capability: this.capability };
    if (!this.starting) {
      const request = token(16);
      this.requests.add(request);
      this.starting = (async () => {
        try {
          const value = requireSuccess(await sefirahTransportCall({
            op: 'start', handle: this.handle, request, capability: this.capability,
          }));
          if (this.closed) throw new Error('Sefirah session closed');
          if (typeof value !== 'object' || value === null ||
              typeof (value as Record<string, unknown>).onion !== 'string') {
            throw new Error('Invalid native Sefirah address');
          }
          const onion = (value as { onion: string }).onion;
          if (!/^[a-z2-7]{56}\.onion$/.test(onion)) throw new Error('Invalid native Sefirah address');
          this.address = onion;
          return onion;
        } catch {
          await this.close();
          throw new Error('Sefirah session could not start');
        } finally {
          this.requests.delete(request);
          this.starting = null;
        }
      })();
    }
    const onion = await this.starting;
    return { onion, capability: this.capability };
  }

  async offer(object: unknown): Promise<void> {
    if (this.closed || !this.address) throw new Error('Sefirah session unavailable');
    requireSuccess(await sefirahTransportCall({ op: 'offer', handle: this.handle, object }));
  }

  /** The caller must verify the contact's signature and decrypt the returned box. */
  async get(
    contact: { onion: string; capability: string },
    id: string,
    signal: AbortSignal,
    verifyContact: (contact: { onion: string; capability: string }) => boolean,
  ): Promise<unknown> {
    if (this.closed || !this.address || signal.aborted) throw new Error('Sefirah session unavailable');
    if (!verifyContact(contact) || !/^[A-Za-z0-9_-]{43}$/.test(id)) {
      throw new Error('Untrusted Sefirah peer');
    }
    const request = token(16);
    this.requests.add(request);
    const cancel = () => { void sefirahTransportCall({ op: 'cancel', request }).catch(() => {}); };
    signal.addEventListener('abort', cancel, { once: true });
    try {
      const object = requireSuccess(await sefirahTransportCall({
        op: 'get', handle: this.handle, request, onion: contact.onion,
        capability: contact.capability, id,
      }));
      if (this.closed || signal.aborted) throw new Error('Sefirah request cancelled');
      return object;
    } finally {
      signal.removeEventListener('abort', cancel);
      this.requests.delete(request);
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.address = null;
    for (const request of this.requests) {
      void sefirahTransportCall({ op: 'cancel', request }).catch(() => {});
    }
    this.requests.clear();
    await sefirahTransportCall({ op: 'stop', handle: this.handle }).catch(() => {});
  }
}
