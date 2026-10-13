import { beforeEach, describe, expect, it, vi } from 'vitest';
import { identityFromSeed, randomBytes, sealPost, signPeerContact } from '@tero/crypto';
import { NativeSefirah, probeNativePrimary } from './sefirah-native';

const bridge = vi.hoisted(() => ({
  enabled: true,
  start: vi.fn(),
  offer: vi.fn(),
  get: vi.fn(),
  cancel: vi.fn(),
  stop: vi.fn(),
}));
vi.mock('expo-modules-core', () => ({ requireOptionalNativeModule: () => bridge }));
const identity = identityFromSeed(randomBytes(64));
const peerIdentity = identityFromSeed(randomBytes(64));
const address = `${'a'.repeat(56)}.onion`;
const reply = (value: unknown) => JSON.stringify({ ok: true, value });
const peer = () => {
  const now = Date.now();
  return signPeerContact(peerIdentity, address, 'B'.repeat(43), now, now + 60_000);
};
beforeEach(() => {
  vi.resetAllMocks();
  bridge.start.mockResolvedValue(reply({ onion: address }));
  bridge.offer.mockResolvedValue(reply({}));
});

describe('native session binding lifecycle', () => {
  it('signs the native address without passing identity or content keys to JNI', async () => {
    const node = new NativeSefirah();
    const contact = await node.start(identity);
    expect(contact.owner).toBe(identity.did);
    expect(bridge.start.mock.calls[0]).toHaveLength(3);
    expect(bridge.start.mock.calls[0].every((v: unknown) => typeof v === 'string')).toBe(true);
    expect(bridge.start.mock.calls[0]).not.toContain(identity.did);
    expect(await node.start(identity)).toEqual(contact);
    expect(bridge.start).toHaveBeenCalledTimes(1);
    const object = sealPost(randomBytes(32), identity.secretKey, 'test', Date.now() + 60_000);
    await node.offer(object);
    expect(JSON.parse(bridge.offer.mock.calls[0][1])).toEqual(object);
    node.close();
  });
  it('stops an in-progress bootstrap and discards its late result', async () => {
    let finish!: (text: string) => void;
    bridge.start.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const node = new NativeSefirah();
    const start = node.start(identity);
    node.close();
    expect(bridge.cancel).toHaveBeenCalledWith(bridge.start.mock.calls[0][1]);
    expect(bridge.stop).toHaveBeenCalledWith(bridge.start.mock.calls[0][0]);
    finish(reply({ onion: address }));
    await expect(start).rejects.toThrow('closed');
    expect(() => node.start(identity)).toThrow('unavailable');
  });
  it('rejects unpinned contacts before requesting a connection', async () => {
    const node = new NativeSefirah();
    await node.start(identity);
    await expect(
      node.get(peer(), identity.did, 'A'.repeat(43), new AbortController().signal),
    ).rejects.toThrow('untrusted');
    expect(bridge.get).not.toHaveBeenCalled();
    node.close();
  });
  it('validates returned object bytes and cancels a pending get on close', async () => {
    const node = new NativeSefirah();
    await node.start(identity);
    const object = sealPost(randomBytes(32), peerIdentity.secretKey, 'test', Date.now() + 60_000);
    bridge.get.mockResolvedValue(reply(object));
    expect(
      await node.get(peer(), peerIdentity.did, object.id, new AbortController().signal),
    ).toEqual(object);
    bridge.get.mockResolvedValue(reply({ ...object, box: object.box.slice(1) }));
    await expect(
      node.get(peer(), peerIdentity.did, object.id, new AbortController().signal),
    ).rejects.toThrow('invalid');
    let finish!: (text: string) => void;
    bridge.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = node.get(peer(), peerIdentity.did, object.id, new AbortController().signal);
    node.close();
    finish(reply(object));
    await expect(pending).rejects.toThrow('unavailable');
    expect(bridge.cancel).toHaveBeenCalled();
  });
});

describe('synthetic primary route probe', () => {
  it('verifies the fetched synthetic encrypted object and closes the temporary native session', async () => {
    bridge.get.mockImplementation(async (_handle, _request, _onion, _capability, id) => {
      const object = JSON.parse(bridge.offer.mock.calls[0][1]);
      expect(object.id).toBe(id);
      return reply(object);
    });
    await probeNativePrimary(new AbortController().signal);
    expect(bridge.offer).toHaveBeenCalledOnce();
    expect(bridge.get).toHaveBeenCalledOnce();
    expect(bridge.stop).toHaveBeenCalledWith(bridge.start.mock.calls[0][0]);
  });

  it('closes a bootstrap that outlives cancellation without offering content', async () => {
    let finish!: (text: string) => void;
    bridge.start.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const controller = new AbortController();
    const probe = probeNativePrimary(controller.signal);
    controller.abort();
    finish(reply({ onion: address }));
    await expect(probe).rejects.toThrow();
    expect(bridge.offer).not.toHaveBeenCalled();
    expect(bridge.cancel).toHaveBeenCalled();
    expect(bridge.stop).toHaveBeenCalledWith(bridge.start.mock.calls[0][0]);
  });

  it('rejects a corrupt response and still closes the probe', async () => {
    bridge.get.mockResolvedValue(reply({ invalid: true }));
    await expect(probeNativePrimary(new AbortController().signal)).rejects.toThrow('invalid');
    expect(bridge.stop).toHaveBeenCalledWith(bridge.start.mock.calls[0][0]);
  });
});
