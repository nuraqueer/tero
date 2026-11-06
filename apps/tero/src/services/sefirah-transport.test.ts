import { afterEach, describe, expect, it, vi } from 'vitest';
import { sefirahTransportCall } from './sefirah-transport';

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

describe('Sefirah Tauri transport boundary', () => {
  it('does not run during SSR or in an ordinary browser', async () => {
    await expect(sefirahTransportCall({ op: 'stop', handle: 'session' })).rejects.toThrow('unavailable');
    vi.stubGlobal('window', {});
    await expect(sefirahTransportCall({ op: 'stop', handle: 'session' })).rejects.toThrow('unavailable');
    expect(native.invoke).not.toHaveBeenCalled();
  });

  it('passes only the requested transport operation', async () => {
    vi.stubGlobal('window', {});
    native.isTauri.mockReturnValue(true);
    native.invoke.mockResolvedValue({ ok: true, value: {} });
    const request = { op: 'stop' as const, handle: 'native-session' };
    await expect(sefirahTransportCall(request)).resolves.toEqual({ ok: true, value: {} });
    expect(native.invoke).toHaveBeenCalledWith('sefirah_transport_call', { request });
  });

  it('retains sanitized native errors and rejects malformed results', async () => {
    vi.stubGlobal('window', {});
    native.isTauri.mockReturnValue(true);
    native.invoke.mockResolvedValueOnce({ ok: false, error: 'native_timeout' });
    await expect(sefirahTransportCall({ op: 'cancel', request: 'job' })).resolves.toEqual({
      ok: false,
      error: 'native_timeout',
    });
    native.invoke.mockResolvedValueOnce({ ok: 'yes' });
    await expect(sefirahTransportCall({ op: 'stop', handle: 'session' })).rejects.toThrow('Invalid');
  });
});
