/** Access to a session that was already opened and authorised by native Rust.
 * No public JS API can create a chat using raw identity keys or storage paths.
 */
export type NativeHandshakeState = 'fresh' | 'offered' | 'established';
export interface NativeReceivedMessage { id: string; text: string }
export interface NativePendingMessage { id: string; kind: string; wire: number[] }

async function nativeChatInvoke(command: string, args: Record<string, unknown>): Promise<unknown> {
  if (typeof window === 'undefined') throw new Error('Native chat unavailable');
  const { invoke, isTauri } = await import('@tauri-apps/api/core');
  if (!isTauri()) throw new Error('Native chat unavailable');
  return invoke<unknown>(command, args);
}

function checkedWire(value: unknown): Uint8Array {
  if (!Array.isArray(value) || value.length === 0 || value.length > 65536 ||
      !value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
    throw new Error('Invalid native MLS wire');
  }
  return new Uint8Array(value);
}

function wireInput(wire: Uint8Array): number[] {
  if (wire.length === 0 || wire.length > 65536) throw new Error('Invalid MLS wire');
  return Array.from(wire);
}

export class NativeChatSession {
  constructor(private readonly handle: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(handle)) throw new Error('Invalid native chat handle');
  }

  async state(): Promise<NativeHandshakeState> {
    const state = await nativeChatInvoke('chat_session_state', { handle: this.handle });
    if (state !== 'fresh' && state !== 'offered' && state !== 'established') {
      throw new Error('Invalid native chat state');
    }
    return state;
  }

  async encrypt(text: string): Promise<Uint8Array> {
    if (!text || new TextEncoder().encode(text).length > 4096) {
      throw new Error('Invalid message length');
    }
    const value = await nativeChatInvoke('chat_encrypt', { handle: this.handle, text });
    return checkedWire(value);
  }

  async keyPackage(): Promise<Uint8Array> {
    return checkedWire(await nativeChatInvoke('chat_key_package', { handle: this.handle }));
  }

  async initiate(packageWire: Uint8Array): Promise<Uint8Array> {
    return checkedWire(await nativeChatInvoke('chat_initiate', {
      handle: this.handle,
      package: wireInput(packageWire),
    }));
  }

  async join(welcome: Uint8Array): Promise<void> {
    await nativeChatInvoke('chat_join', { handle: this.handle, welcome: wireInput(welcome) });
  }

  async decrypt(wire: Uint8Array): Promise<string> {
    const value = await nativeChatInvoke('chat_decrypt', { handle: this.handle, wire: wireInput(wire) });
    if (typeof value !== 'string' || !value || new TextEncoder().encode(value).length > 4096) {
      throw new Error('Invalid decrypted message');
    }
    return value;
  }

  async pending(): Promise<NativePendingMessage[]> {
    const value = await nativeChatInvoke('chat_pending', { handle: this.handle });
    if (!Array.isArray(value) || value.length > 32 || !value.every((item) =>
      item && typeof item.id === 'string' && typeof item.kind === 'string' &&
      Array.isArray(item.wire) && item.wire.length <= 65536 &&
      item.wire.every((byte: unknown) => typeof byte === 'number' && Number.isInteger(byte) && byte >= 0 && byte <= 255))) {
      throw new Error('Invalid pending message state');
    }
    return value as NativePendingMessage[];
  }

  async received(): Promise<NativeReceivedMessage[]> {
    const value = await nativeChatInvoke('chat_received', { handle: this.handle });
    if (!Array.isArray(value) || value.length > 32 || !value.every((item) =>
      item && typeof item.id === 'string' && typeof item.text === 'string' &&
      new TextEncoder().encode(item.text).length <= 4096)) {
      throw new Error('Invalid received message state');
    }
    return value as NativeReceivedMessage[];
  }

  async close(): Promise<void> {
    await nativeChatInvoke('chat_close', { handle: this.handle });
  }
}
