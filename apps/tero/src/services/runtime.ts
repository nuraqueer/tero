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

/** A browser must not imply that native encryption or networking is available. */
export async function getRuntimeCapabilities(): Promise<RuntimeCapabilities> {
  if (typeof window === 'undefined') return browserCapabilities;

  const { invoke, isTauri } = await import('@tauri-apps/api/core');
  if (!isTauri()) return browserCapabilities;

  // Errors from the native command propagate. A failed probe is never interpreted as ready.
  return invoke<RuntimeCapabilities>('runtime_capabilities');
}
