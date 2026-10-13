import { beforeEach, describe, expect, it, vi } from 'vitest';
import { identityFromSeed } from '@tero/crypto';
import { SefirahMessages } from './sefirah-mls';

const bridge = vi.hoisted(() => ({
  enabled: true,
  storageVersion: 1,
  queueVersion: 1,
  asyncVersion: 1,
  registerOwner: vi.fn(),
  closeOwner: vi.fn(),
  openAsync: vi.fn(),
  pendingAsync: vi.fn(),
  receivedAsync: vi.fn(),
  handshakeStateAsync: vi.fn(),
  acknowledgePendingAsync: vi.fn(),
  keyPackageAsync: vi.fn(),
  initiateAsync: vi.fn(),
  joinAsync: vi.fn(),
  encryptAsync: vi.fn(),
  decryptAsync: vi.fn(),
  handshakeState: vi.fn(),
  acknowledgePending: vi.fn(),
  open: vi.fn(),
  pending: vi.fn(),
  received: vi.fn(),
  clearProbe: vi.fn(),
  create: vi.fn(),
  keyPackage: vi.fn(),
  initiate: vi.fn(),
  join: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  close: vi.fn(),
}));
vi.mock('expo-modules-core', () => ({ requireOptionalNativeModule: () => bridge }));

const identity = identityFromSeed(new Uint8Array(64).fill(1));
const peer = identityFromSeed(new Uint8Array(64).fill(2));
beforeEach(() => {
  vi.resetAllMocks();
  bridge.queueVersion = 1;
  bridge.asyncVersion = 1;
  let count = 0;
  bridge.create.mockImplementation(() => `handle-${++count}`);
  bridge.open.mockImplementation(() => `persistent-${++count}`);
});

describe('native message engine ownership', () => {
  it('opens encrypted native state with temporary key copies and no memory fallback', () => {
    const key = new Uint8Array(32).fill(7);
    let receivedKey: Uint8Array | undefined;
    let receivedSecret: Uint8Array | undefined;
    bridge.open.mockImplementation(
      (
        secret: Uint8Array,
        peerDid: string,
        storage: Uint8Array,
        namespace: string,
        probe: boolean,
      ) => {
        expect(secret).toEqual(identity.secretKey);
        expect(storage).toEqual(key);
        expect(storage).not.toBe(key);
        expect(peerDid).toBe(peer.did);
        expect(namespace).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(probe).toBe(false);
        receivedKey = storage;
        receivedSecret = secret;
        return 'saved';
      },
    );
    const owner = new SefirahMessages(key);
    const chat = owner.create(identity, peer.did);
    expect(receivedKey).toEqual(new Uint8Array(32));
    expect(receivedSecret).toEqual(new Uint8Array(32));
    expect(key).toEqual(new Uint8Array(32).fill(7));
    expect(bridge.create).not.toHaveBeenCalled();
    bridge.pending.mockReturnValue([{ id: 'id', kind: 'APPLICATION', wire: new Uint8Array([1]) }]);
    bridge.received.mockReturnValue([{ id: 'id', text: 'Saved inbox' }]);
    expect(chat.pending()).toHaveLength(1);
    expect(chat.received()[0]?.text).toBe('Saved inbox');
    owner.close();
    expect(bridge.clearProbe).not.toHaveBeenCalled();
  });

  it('clears only synthetic probe namespaces after closing their engines', () => {
    const owner = new SefirahMessages(new Uint8Array(32).fill(7), true);
    owner.create(identity, peer.did);
    const namespace = bridge.open.mock.calls[0][3];
    expect(bridge.open.mock.calls[0][4]).toBe(true);
    bridge.clearProbe.mockImplementation(() => {
      expect(bridge.close).toHaveBeenCalledWith('persistent-1');
    });
    owner.close();
    expect(bridge.clearProbe).toHaveBeenCalledWith(namespace);
  });

  it('does not silently replace a failed persistent open with an ephemeral engine', () => {
    bridge.open.mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    const owner = new SefirahMessages(new Uint8Array(32).fill(7));
    expect(() => owner.create(identity, peer.did)).toThrow('Storage unavailable');
    expect(bridge.create).not.toHaveBeenCalled();
    owner.close();
  });
  it('passes a temporary key copy and clears it without changing account keys', () => {
    const original = identity.secretKey.slice();
    let received: Uint8Array | undefined;
    bridge.create.mockImplementation((secret: Uint8Array, did: string) => {
      expect(secret).toEqual(original);
      expect(secret).not.toBe(identity.secretKey);
      expect(did).toBe(peer.did);
      received = secret;
      return 'handle';
    });
    const owner = new SefirahMessages();
    owner.create(identity, peer.did);
    expect(received).toEqual(new Uint8Array(32));
    expect(identity.secretKey).toEqual(original);
    owner.close();
  });

  it('clears the temporary seed if native creation rejects', () => {
    let received: Uint8Array | undefined;
    bridge.create.mockImplementation((secret: Uint8Array) => {
      received = secret;
      throw new Error('Rejected');
    });
    const owner = new SefirahMessages();
    expect(() => owner.create(identity, peer.did)).toThrow('Rejected');
    expect(received).toEqual(new Uint8Array(32));
    owner.close();
    expect(bridge.close).not.toHaveBeenCalled();
  });

  it('routes public handshake bytes and ciphertext through the opaque handle', () => {
    const owner = new SefirahMessages();
    const chat = owner.create(identity, peer.did);
    const bytes = new Uint8Array([1, 2, 3]);
    bridge.keyPackage.mockReturnValue(bytes);
    bridge.initiate.mockReturnValue(bytes);
    bridge.encrypt.mockReturnValue(bytes);
    bridge.decrypt.mockReturnValue('Text');
    expect(chat.keyPackage()).toBe(bytes);
    expect(chat.initiate(bytes)).toBe(bytes);
    chat.join(bytes);
    expect(chat.encrypt('Text')).toBe(bytes);
    expect(chat.decrypt(bytes)).toBe('Text');
    expect(bridge.join).toHaveBeenCalledWith('handle-1', bytes);
    expect(bridge.encrypt).toHaveBeenCalledWith('handle-1', 'Text');
    owner.close();
  });

  it('closes every engine and rejects use or creation after owner closure', () => {
    const owner = new SefirahMessages();
    const first = owner.create(identity, peer.did);
    const second = owner.create(identity, peer.did);
    first.close();
    owner.close();
    owner.close();
    expect(bridge.close.mock.calls).toEqual([['handle-1'], ['handle-2']]);
    expect(() => second.keyPackage()).toThrow('Conversation closed');
    expect(() => second.initiate(new Uint8Array())).toThrow('Conversation closed');
    expect(() => second.join(new Uint8Array())).toThrow('Conversation closed');
    expect(() => second.encrypt('Text')).toThrow('Conversation closed');
    expect(() => second.decrypt(new Uint8Array())).toThrow('Conversation closed');
    expect(() => owner.create(identity, peer.did)).toThrow('Native messaging unavailable');
  });

  it('continues closing other engines when one native disposal fails', () => {
    const owner = new SefirahMessages();
    owner.create(identity, peer.did);
    owner.create(identity, peer.did);
    bridge.close.mockImplementationOnce(() => {
      throw new Error('Disposal failed');
    });
    expect(() => owner.close()).not.toThrow();
    expect(bridge.close).toHaveBeenCalledTimes(2);
  });

  it('uses the same owned handle for restart state and exact queue acknowledgements', () => {
    const owner = new SefirahMessages(new Uint8Array(32).fill(7));
    const chat = owner.create(identity, peer.did);
    bridge.handshakeState.mockReturnValue('offered');
    bridge.acknowledgePending.mockReturnValueOnce(true).mockReturnValueOnce(false);
    expect(chat.handshakeState()).toBe('offered');
    expect(chat.acknowledgePending('wire-id')).toBe(true);
    expect(chat.acknowledgePending('wire-id')).toBe(false);
    expect(bridge.handshakeState).toHaveBeenCalledWith('persistent-1');
    expect(bridge.acknowledgePending).toHaveBeenCalledWith('persistent-1', 'wire-id');
    owner.close();
    expect(() => chat.handshakeState()).toThrow('Conversation closed');
    expect(() => chat.acknowledgePending('wire-id')).toThrow('Conversation closed');
  });

  it('rejects older installed bridges and unknown native handshake states', () => {
    const owner = new SefirahMessages();
    const chat = owner.create(identity, peer.did);
    bridge.queueVersion = 0;
    expect(() => chat.handshakeState()).toThrow('Native delivery primitives unavailable');
    expect(() => chat.acknowledgePending('wire-id')).toThrow(
      'Native delivery primitives unavailable',
    );
    expect(bridge.acknowledgePending).not.toHaveBeenCalled();
    bridge.queueVersion = 1;
    bridge.handshakeState.mockReturnValue('unknown');
    expect(() => chat.handshakeState()).toThrow('Invalid native handshake state');
    owner.close();
  });
});

describe('asynchronous native message lifetimes', () => {
  beforeEach(() => {
    bridge.asyncVersion = 1;
    bridge.openAsync.mockResolvedValue('async-handle');
  });

  it('cancels a queued open on lock and rejects a late native result', async () => {
    let resolve!: (handle: string) => void;
    bridge.openAsync.mockImplementation(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    );
    const owner = new SefirahMessages(new Uint8Array(32).fill(7));
    const pending = owner.createAsync(identity, peer.did);
    const args = bridge.openAsync.mock.calls[0];
    expect(args[1]).toEqual(identity.secretKey);
    expect(args[3]).toEqual(new Uint8Array(32).fill(7));
    owner.close();
    expect(bridge.closeOwner).toHaveBeenCalledWith(args[0]);
    resolve('late-handle');
    await expect(pending).rejects.toThrow('Conversation closed');
    expect(bridge.close).toHaveBeenCalledWith('late-handle');
    expect(args[1]).toEqual(new Uint8Array(32));
    expect(args[3]).toEqual(new Uint8Array(32));
    expect(identity.secretKey).not.toEqual(new Uint8Array(32));
  });

  it('cancels a queued open on route blur without closing the session owner', async () => {
    let resolve!: (handle: string) => void;
    bridge.openAsync.mockImplementationOnce(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    );
    const owner = new SefirahMessages(new Uint8Array(32).fill(7));
    const controller = new AbortController();
    const pending = owner.createAsync(identity, peer.did, controller.signal);
    const lifetime = bridge.registerOwner.mock.calls[0][0];
    controller.abort();
    expect(bridge.closeOwner).toHaveBeenCalledWith(lifetime);
    resolve('blurred-handle');
    await expect(pending).rejects.toThrow('Conversation closed');
    const next = await owner.createAsync(identity, peer.did);
    expect(bridge.registerOwner.mock.calls[1][0]).not.toBe(lifetime);
    next.close();
    owner.close();
  });

  it('does not return an inbox or encrypted output after closure', async () => {
    let resolve!: (items: { id: string; text: string }[]) => void;
    bridge.receivedAsync.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const owner = new SefirahMessages(new Uint8Array(32).fill(7));
    const chat = await owner.createAsync(identity, peer.did);
    const pending = chat.receivedAsync();
    owner.close();
    resolve([{ id: 'id', text: 'private' }]);
    await expect(pending).rejects.toThrow('Conversation closed');
    await expect(chat.encryptAsync('private')).rejects.toThrow('Conversation closed');
    expect(bridge.encryptAsync).not.toHaveBeenCalled();
  });

  it('closes an established conversation when its route aborts', async () => {
    const owner = new SefirahMessages(new Uint8Array(32).fill(7));
    const controller = new AbortController();
    const chat = await owner.createAsync(identity, peer.did, controller.signal);
    controller.abort();
    await expect(chat.receivedAsync()).rejects.toThrow('Conversation closed');
    expect(bridge.close).toHaveBeenCalledWith('async-handle');
    owner.close();
  });

  it('releases registration and wipes temporary copies on a failed open', async () => {
    bridge.openAsync.mockRejectedValue(new Error('Storage unavailable'));
    const owner = new SefirahMessages(new Uint8Array(32).fill(7));
    await expect(owner.createAsync(identity, peer.did)).rejects.toThrow('Storage unavailable');
    const args = bridge.openAsync.mock.calls[0];
    expect(bridge.closeOwner).toHaveBeenCalledWith(args[0]);
    expect(args[1]).toEqual(new Uint8Array(32));
    expect(args[3]).toEqual(new Uint8Array(32));
    expect(bridge.open).not.toHaveBeenCalled();
    owner.close();
  });

  it('rejects an already cancelled route and an older native bridge without sync fallback', async () => {
    const owner = new SefirahMessages(new Uint8Array(32).fill(7));
    const controller = new AbortController();
    controller.abort();
    await expect(owner.createAsync(identity, peer.did, controller.signal)).rejects.toThrow();
    bridge.asyncVersion = 0;
    await expect(owner.createAsync(identity, peer.did)).rejects.toThrow(
      'Async native message storage unavailable',
    );
    expect(bridge.openAsync).not.toHaveBeenCalled();
    expect(bridge.registerOwner).not.toHaveBeenCalled();
    owner.close();
  });
});
