/** Existing Sefirah Tor JSON ABI, exposed through Tauri on supported devices.
 * This does not by itself authenticate contacts or prove end-to-end delivery.
 */
export type TransportRequest =
  | { op: 'start'; handle: string; request: string; capability: string }
  | { op: 'stop'; handle: string }
  | { op: 'cancel'; request: string }
  | { op: 'offer'; handle: string; object: unknown }
  | { op: 'forget'; handle: string; id: string }
  | { op: 'get'; handle: string; request: string; onion: string; capability: string; id: string };

export type TransportResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export async function sefirahTransportCall(request: TransportRequest): Promise<TransportResult> {
  if (typeof window === 'undefined') throw new Error('Native transport unavailable');
  const { invoke, isTauri } = await import('@tauri-apps/api/core');
  if (!isTauri()) throw new Error('Native transport unavailable');

  const response: unknown = await invoke('sefirah_transport_call', { request });
  if (typeof response !== 'object' || response === null) {
    throw new Error('Invalid native transport response');
  }
  const result = response as Record<string, unknown>;
  if (result.ok === true && 'value' in result) return { ok: true, value: result.value };
  if (result.ok === false && typeof result.error === 'string') {
    return { ok: false, error: result.error };
  }
  throw new Error('Invalid native transport response');
}
