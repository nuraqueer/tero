import { afterEach, describe, expect, it, vi } from 'vitest';
import { NativeChatSession } from '../src/services/native-chat';

const native = vi.hoisted(() => ({ isTauri: vi.fn(() => false), invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => native);
const handle = 'a'.repeat(43);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  native.isTauri.mockReturnValue(false);
});

describe('native MLS conversation boundary', () => {
  it('rejects invalid handles and browsers', async () => {
    expect(() => new NativeChatSession('x')).toThrow('handle');
    const chat = new NativeChatSession(handle);
    vi.stubGlobal('window', {});
    await expect(chat.state()).rejects.toThrow('unavailable');
    expect(native.invoke).not.toHaveBeenCalled();
  });

  it('only accepts native-proven handshake states', async () => {
    vi.stubGlobal('window', {});
    native.isTauri.mockReturnValue(true);
    native.invoke.mockResolvedValueOnce('established').mockResolvedValueOnce('ready');
    const chat = new NativeChatSession(handle);
    await expect(chat.state()).resolves.toBe('established');
    await expect(chat.state()).rejects.toThrow('Invalid');
  });

  it('rejects oversized text before crossing the native boundary', async () => {
    vi.stubGlobal('window', {});
    native.isTauri.mockReturnValue(true);
    const chat = new NativeChatSession(handle);
    await expect(chat.encrypt('x'.repeat(4097))).rejects.toThrow('length');
    expect(native.invoke).not.toHaveBeenCalled();
  });

  it('keeps key-package and group handshakes in native Rust', async () => {
    vi.stubGlobal('window', {});
    native.isTauri.mockReturnValue(true);
    native.invoke.mockResolvedValueOnce([1, 2, 3]).mockResolvedValueOnce([4, 5]).mockResolvedValueOnce(null);
    const chat = new NativeChatSession(handle);
    await expect(chat.keyPackage()).resolves.toEqual(new Uint8Array([1, 2, 3]));
    await expect(chat.initiate(new Uint8Array([1, 2, 3]))).resolves.toEqual(new Uint8Array([4, 5]));
    await chat.join(new Uint8Array([4, 5]));
    expect(native.invoke).toHaveBeenNthCalledWith(1, 'chat_key_package', { handle });
    expect(native.invoke).toHaveBeenNthCalledWith(2, 'chat_initiate', { handle, package: [1, 2, 3] });
    expect(native.invoke).toHaveBeenNthCalledWith(3, 'chat_join', { handle, welcome: [4, 5] });
  });
});
