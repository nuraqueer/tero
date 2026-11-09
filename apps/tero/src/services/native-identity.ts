/** Native identity status and explicit relock. Account secrets are never IPC
 * arguments or results. Unlock is unavailable until device storage is wired.
 */
async function identityCommand<T>(command: 'identity_lock' | 'identity_is_unlocked'): Promise<T> {
  if (typeof window === 'undefined') throw new Error('Native identity unavailable');
  const { invoke, isTauri } = await import('@tauri-apps/api/core');
  if (!isTauri()) throw new Error('Native identity unavailable');
  return invoke<T>(command);
}

export async function isNativeIdentityUnlocked(): Promise<boolean> {
  const unlocked = await identityCommand<unknown>('identity_is_unlocked');
  if (typeof unlocked !== 'boolean') throw new Error('Invalid native identity state');
  return unlocked;
}

export async function lockNativeIdentity(): Promise<void> {
  await identityCommand<void>('identity_lock');
}
