export interface RuntimeCapabilities {
  native: boolean;
  identityVaultReady: boolean;
  peerTransportReady: boolean;
  cloudFallbackEnabled: boolean;
}

const browserCapabilities: RuntimeCapabilities = {
  native: false,
  identityVaultReady: false,
  peerTransportReady: false,
  cloudFallbackEnabled: false,
};

function parseRuntimeCapabilities(value: unknown): RuntimeCapabilities {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid native runtime capabilities');
  }

  const fields = value as Record<string, unknown>;
  if (
    fields.native !== true ||
    typeof fields.identityVaultReady !== 'boolean' ||
    typeof fields.peerTransportReady !== 'boolean' ||
    typeof fields.cloudFallbackEnabled !== 'boolean'
  ) {
    throw new Error('Invalid native runtime capabilities');
  }

  return {
    native: true,
    identityVaultReady: fields.identityVaultReady,
    peerTransportReady: fields.peerTransportReady,
    cloudFallbackEnabled: fields.cloudFallbackEnabled,
  };
}

/** A browser must not imply that native encryption or networking is available. */
export async function getRuntimeCapabilities(): Promise<RuntimeCapabilities> {
  if (typeof window === 'undefined') return browserCapabilities;

  const { invoke, isTauri } = await import('@tauri-apps/api/core');
  if (!isTauri()) return browserCapabilities;

  // Errors from the native command propagate. A failed probe is never interpreted as ready.
  return parseRuntimeCapabilities(await invoke<unknown>('runtime_capabilities'));
}
