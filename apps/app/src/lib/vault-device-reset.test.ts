import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetVault, hasVault } from './vault';

const storage = vi.hoisted(() => ({ values: new Map<string, string>(), fail: false }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('./secure-storage', () => ({
  getItem: async (key: string) => storage.values.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    storage.values.set(key, value);
  },
  deleteItem: async (key: string) => {
    if (storage.fail) throw new Error('storage unavailable');
    storage.values.delete(key);
  },
}));

beforeEach(() => {
  storage.fail = false;
  storage.values = new Map([
    ['tero.vault', 'synthetic encrypted vault'],
    ['tero.device', 'synthetic device secret'],
    ['tero.failures', 'synthetic lock state'],
    ['another-setting', 'keep'],
  ]);
});

describe('forget this device login', () => {
  it('removes vault keys and leaves unrelated settings intact', async () => {
    expect(await hasVault()).toBe(true);
    await forgetVault();
    expect(await hasVault()).toBe(false);
    expect([...storage.values.entries()]).toEqual([['another-setting', 'keep']]);
  });
  it('can safely repeat after the login is already removed', async () => {
    await forgetVault();
    await forgetVault();
    expect(await hasVault()).toBe(false);
  });
  it('reports storage failure rather than pretending to reset', async () => {
    storage.fail = true;
    await expect(forgetVault()).rejects.toThrow('storage unavailable');
    expect(await hasVault()).toBe(true);
  });
});
