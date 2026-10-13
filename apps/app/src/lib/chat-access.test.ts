import { describe, expect, it, vi } from 'vitest';
import { identityFromSeed } from '@tero/crypto';
import { ChatAccessError, requireAcceptedContact } from './chat-access';

const own = identityFromSeed(new Uint8Array(64).fill(1)).did;
const peer = identityFromSeed(new Uint8Array(64).fill(2)).did;

describe('chat contact access', () => {
  it('allows an accepted contact after fetching current server state', async () => {
    const connections = vi.fn().mockResolvedValue({ connections: [{ peer, state: 'accepted' }] });
    await expect(requireAcceptedContact({ connections }, own, peer)).resolves.toBeUndefined();
    expect(connections).toHaveBeenCalledOnce();
  });
  it('rejects pending requests and removed contacts', async () => {
    for (const state of ['incoming', 'outgoing', null]) {
      const connections = vi
        .fn()
        .mockResolvedValue({ connections: state ? [{ peer, state }] : [] });
      await expect(requireAcceptedContact({ connections }, own, peer)).rejects.toBeInstanceOf(
        ChatAccessError,
      );
    }
  });
  it('rejects own identity and malformed routes before making a request', async () => {
    const connections = vi.fn();
    await expect(requireAcceptedContact({ connections }, own, own)).rejects.toBeInstanceOf(
      ChatAccessError,
    );
    await expect(requireAcceptedContact({ connections }, own, 'invalid')).rejects.toBeInstanceOf(
      ChatAccessError,
    );
    expect(connections).not.toHaveBeenCalled();
  });
});
