/** Read-only legacy envelope metadata. This does not mean an identity is restored. */
export interface LegacyVaultInspection {
  formatVersion: 1;
  kdfLog2N: number;
  compatibleKdf: boolean;
}

export async function inspectLegacyVault(encoded: string): Promise<LegacyVaultInspection> {
  if (typeof window === 'undefined') throw new Error('Native inspection is unavailable');

  const { invoke, isTauri } = await import('@tauri-apps/api/core');
  if (!isTauri()) throw new Error('Native inspection is unavailable');

  // Never log or persist the vault record. This command does not accept credentials.
  const result: unknown = await invoke('inspect_legacy_vault', { encoded });
  if (typeof result !== 'object' || result === null) throw new Error('Invalid inspection result');
  const fields = result as Record<string, unknown>;
  if (
    fields.formatVersion !== 1 ||
    typeof fields.kdfLog2N !== 'number' ||
    !Number.isInteger(fields.kdfLog2N) ||
    typeof fields.compatibleKdf !== 'boolean'
  ) {
    throw new Error('Invalid inspection result');
  }
  return {
    formatVersion: 1,
    kdfLog2N: fields.kdfLog2N as number,
    compatibleKdf: fields.compatibleKdf,
  };
}
