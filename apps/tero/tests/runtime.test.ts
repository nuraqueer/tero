import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRuntimeCapabilities } from '../src/services/runtime';

const native = vi.hoisted(() => ({
  isTauri: vi.fn(() => false),
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => native);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  native.isTauri.mockReturnValue(false);
});

describe('runtime capability boundary', () => {
  it('never reports native services as available during server rendering', async () => {
    expect(await getRuntimeCapabilities()).toEqual({
      native: false,
      identityVaultReady: false,
      peerTransportReady: false,
      cloudFallbackEnabled: false,
    });
    expect(native.invoke).not.toHaveBeenCalled();
  });

  it('does not call a native command in an ordinary browser', async () => {
    vi.stubGlobal('window', {});
    expect((await getRuntimeCapabilities()).native).toBe(false);
    expect(native.invoke).not.toHaveBeenCalled();
  });

  it('uses the real native command and propagates its failure', async () => {
    vi.stubGlobal('window', {});
    native.isTauri.mockReturnValue(true);
    native.invoke.mockRejectedValueOnce(new Error('Native bridge unavailable'));
    await expect(getRuntimeCapabilities()).rejects.toThrow('Native bridge unavailable');
    expect(native.invoke).toHaveBeenCalledWith('runtime_capabilities');
  });

  it('rejects malformed native responses instead of enabling unavailable services', async () => {
    vi.stubGlobal('window', {});
    native.isTauri.mockReturnValue(true);
    native.invoke.mockResolvedValueOnce({ native: true, identityVaultReady: 'yes' });
    await expect(getRuntimeCapabilities()).rejects.toThrow('Invalid native runtime capabilities');
  });

  it('preserves disabled native capabilities without assuming the cloud is available', async () => {
    vi.stubGlobal('window', {});
    native.isTauri.mockReturnValue(true);
    native.invoke.mockResolvedValueOnce({
      native: true,
      identityVaultReady: false,
      peerTransportReady: false,
      cloudFallbackEnabled: false,
    });
    expect(await getRuntimeCapabilities()).toEqual({
      native: true,
      identityVaultReady: false,
      peerTransportReady: false,
      cloudFallbackEnabled: false,
    });
  });
});
