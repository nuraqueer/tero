import { afterEach, describe, expect, it, vi } from 'vitest';
import { isNativeIdentityUnlocked, lockNativeIdentity } from '../src/services/native-identity';

const native = vi.hoisted(() => ({ isTauri: vi.fn(() => false), invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => native);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  native.isTauri.mockReturnValue(false);
});

describe('native identity lifecycle bridge', () => {
  it('fails closed outside a native runtime', async () => {
    await expect(isNativeIdentityUnlocked()).rejects.toThrow('unavailable');
    vi.stubGlobal('window', {});
    await expect(lockNativeIdentity()).rejects.toThrow('unavailable');
    expect(native.invoke).not.toHaveBeenCalled();
  });

  it('exposes only lock and boolean status commands', async () => {
    vi.stubGlobal('window', {});
    native.isTauri.mockReturnValue(true);
    native.invoke.mockResolvedValueOnce(true).mockResolvedValueOnce(undefined);
    await expect(isNativeIdentityUnlocked()).resolves.toBe(true);
    await lockNativeIdentity();
    expect(native.invoke).toHaveBeenNthCalledWith(1, 'identity_is_unlocked');
    expect(native.invoke).toHaveBeenNthCalledWith(2, 'identity_lock');
  });

  it('rejects status values other than boolean', async () => {
    vi.stubGlobal('window', {});
    native.isTauri.mockReturnValue(true);
    native.invoke.mockResolvedValue('true');
    await expect(isNativeIdentityUnlocked()).rejects.toThrow('Invalid native identity state');
  });
});
