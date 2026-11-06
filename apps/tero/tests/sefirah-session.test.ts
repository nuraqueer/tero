import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SefirahSession } from '../src/services/sefirah-session';
import { sefirahTransportCall } from '../src/services/sefirah-transport';

vi.mock('../src/services/sefirah-transport', () => ({ sefirahTransportCall: vi.fn() }));
const call = vi.mocked(sefirahTransportCall);
const onion = `${'a'.repeat(56)}.onion`;

beforeEach(() => {
  vi.stubGlobal('crypto', { getRandomValues: (values: Uint8Array) => values.fill(5) });
  call.mockResolvedValue({ ok: true, value: {} });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('native Sefirah session lifecycle', () => {
  it('starts once and refuses an invalid native onion address', async () => {
    const session = new SefirahSession();
    call.mockResolvedValueOnce({ ok: true, value: { onion } });
    const first = await session.start();
    expect(first.onion).toBe(onion);
    await session.start();
    expect(call).toHaveBeenCalledTimes(1);
    await session.close();
    await expect(session.start()).rejects.toThrow('closed');
  });

  it('does not fetch from unverified contacts', async () => {
    const session = new SefirahSession();
    call.mockResolvedValueOnce({ ok: true, value: { onion } });
    await session.start();
    const numberOfCalls = call.mock.calls.length;
    await expect(session.get({ onion, capability: 'a'.repeat(43) }, 'x'.repeat(43),
      new AbortController().signal, () => false)).rejects.toThrow('Untrusted');
    expect(call).toHaveBeenCalledTimes(numberOfCalls);
    await session.close();
  });

  it('fails closed after native start failure', async () => {
    const session = new SefirahSession();
    call.mockResolvedValueOnce({ ok: false, error: 'native_timeout' });
    await expect(session.start()).rejects.toThrow('could not start');
    await expect(session.offer({})).rejects.toThrow('unavailable');
  });
});
