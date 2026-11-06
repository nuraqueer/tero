import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspectLegacyVault } from '../src/services/legacy-vault';

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

describe('read-only legacy vault inspection', () => {
  it('fails closed during SSR and in browsers', async () => {
    await expect(inspectLegacyVault('record')).rejects.toThrow('unavailable');
    vi.stubGlobal('window', {});
    await expect(inspectLegacyVault('record')).rejects.toThrow('unavailable');
    expect(native.invoke).not.toHaveBeenCalled();
  });

  it('invokes the native read-only command without any credential fields', async () => {
    vi.stubGlobal('window', {});
    native.isTauri.mockReturnValue(true);
    native.invoke.mockResolvedValue({ formatVersion: 1, kdfLog2N: 12, compatibleKdf: true });
    await expect(inspectLegacyVault('opaque-envelope')).resolves.toEqual({
      formatVersion: 1,
      kdfLog2N: 12,
      compatibleKdf: true,
    });
    expect(native.invoke).toHaveBeenCalledWith('inspect_legacy_vault', { encoded: 'opaque-envelope' });
  });

  it('rejects an unexpected native response', async () => {
    vi.stubGlobal('window', {});
    native.isTauri.mockReturnValue(true);
    native.invoke.mockResolvedValue({ formatVersion: 1, kdfLog2N: '12', compatibleKdf: true });
    await expect(inspectLegacyVault('record')).rejects.toThrow('Invalid inspection result');
  });
});
