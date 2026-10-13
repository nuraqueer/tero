import { describe, expect, it } from 'vitest';
import {
  bytesToBase64Url,
  directoryId,
  directoryHandleTag,
  grantDirectoryKey,
  identityFromSeed,
  randomBytes,
  sealMemberProfile,
  sign,
} from '@tero/crypto';
import { signInMessage } from '@tero/protocol';
import { Registry } from './registry';
import { memorySql, testRegistry } from './test-registry';
import worker, { type Env } from './index';

const fool = identityFromSeed(new Uint8Array(64).fill(1));
const alice = identityFromSeed(new Uint8Array(64).fill(2));
const bob = identityFromSeed(new Uint8Array(64).fill(3));
const outsider = identityFromSeed(new Uint8Array(64).fill(4));
function world() {
  const registry = new Registry(memorySql(), fool.did);
  registry.member(fool.did, 1);
  for (const identity of [alice, bob]) {
    const id = bytesToBase64Url(randomBytes(32));
    expect(
      registry.createCard(
        fool.did,
        { id, nonce: bytesToBase64Url(randomBytes(16)), type: 'member' },
        1,
      ).ok,
    ).toBe(true);
    registry.claimCard(identity.did, id, 2);
    registry.approveCard(fool.did, id, identity.did, 3);
  }
  return registry.discovery;
}
function init(directory: ReturnType<typeof world>, key = randomBytes(32)) {
  expect(directory.grant(fool.did, grantDirectoryKey(fool, fool.did, key)).ok).toBe(true);
  for (const identity of [alice, bob])
    expect(directory.grant(fool.did, grantDirectoryKey(fool, identity.did, key)).ok).toBe(true);
  return key;
}
describe('member discovery registry', () => {
  it('admits members only and permits only the Fool to initialize the directory', () => {
    const d = world();
    const key = randomBytes(32);
    expect(d.page(outsider.did, '')).toMatchObject({ ok: false, error: 'not_member' });
    expect(d.grant(alice.did, grantDirectoryKey(alice, alice.did, key))).toMatchObject({
      ok: false,
      error: 'not_allowed',
    });
    init(d, key);
    expect(d.grant(fool.did, grantDirectoryKey(fool, outsider.did, key))).toMatchObject({
      ok: false,
      error: 'not_member',
    });
    expect(d.grant(alice.did, grantDirectoryKey(alice, alice.did, randomBytes(32)))).toMatchObject({
      ok: false,
      error: 'conflict',
    });
  });
  it('does not let an earlier grant block another sender from granting access', () => {
    const d = world();
    const key = init(d);
    expect(d.grant(alice.did, grantDirectoryKey(alice, bob.did, key)).ok).toBe(true);
    const page = d.page(bob.did, '');
    expect(page.ok && page.grants).toHaveLength(2);
    const own = d.page(alice.did, '');
    expect(own.ok && own.grants.every((grant) => grant.recipient === alice.did)).toBe(true);
  });
  it('checks handle tags without exposing profiles, and rechecks uniqueness when claiming', () => {
    const d = world();
    const key = init(d);
    const tag = directoryHandleTag(key, 'la-niina');
    const directory = directoryId(key);
    expect(d.handleAvailable(outsider.did, directory, tag)).toMatchObject({
      ok: false,
      error: 'not_member',
    });
    expect(d.handleAvailable(bob.did, directoryId(randomBytes(32)), tag)).toMatchObject({
      ok: false,
      error: 'not_allowed',
    });
    expect(d.handleAvailable(bob.did, directory, 'la-niina')).toMatchObject({
      ok: false,
      error: 'bad_request',
    });
    expect(d.handleAvailable(alice.did, directory, tag)).toEqual({ ok: true, available: true });
    expect(d.handleAvailable(bob.did, directory, tag)).toEqual({ ok: true, available: true });
    expect(
      d.saveProfile(
        alice.did,
        sealMemberProfile(alice, key, { handle: 'la-niina', displayName: 'La niina' }, 1),
      ).ok,
    ).toBe(true);
    expect(d.handleAvailable(bob.did, directory, tag)).toEqual({ ok: true, available: false });
    expect(d.handleAvailable(alice.did, directory, tag)).toEqual({ ok: true, available: true });
    expect(
      d.saveProfile(
        bob.did,
        sealMemberProfile(bob, key, { handle: 'la-niina', displayName: 'Other' }, 1),
      ),
    ).toMatchObject({ ok: false, error: 'conflict' });
  });
  it('reserves a unique permanent handle and uses compare and swap for display name updates', () => {
    const d = world();
    const key = init(d);
    const first = sealMemberProfile(alice, key, { handle: 'james', displayName: 'James' }, 1);
    expect(d.saveProfile(alice.did, first).ok).toBe(true);
    expect(d.saveProfile(alice.did, first)).toMatchObject({ ok: false, error: 'conflict' });
    expect(
      d.saveProfile(
        bob.did,
        sealMemberProfile(bob, key, { handle: 'james', displayName: 'Other James' }, 1),
      ),
    ).toMatchObject({ ok: false, error: 'conflict' });
    expect(
      d.saveProfile(
        alice.did,
        sealMemberProfile(alice, key, { handle: 'newhandle', displayName: 'James' }, 2),
      ),
    ).toMatchObject({ ok: false, error: 'conflict' });
    expect(
      d.saveProfile(
        alice.did,
        sealMemberProfile(alice, key, { handle: 'james', displayName: 'James Updated' }, 2),
      ).ok,
    ).toBe(true);
    expect(d.saveProfile(bob.did, first)).toMatchObject({ ok: false, error: 'bad_request' });
    const page = d.page(bob.did, '');
    expect(JSON.stringify(page)).not.toContain('James');
    expect(JSON.stringify(page)).not.toContain('james');
    expect(JSON.stringify(page)).not.toContain('"role"');
    expect(page.ok && page.directory).toBe(directoryId(key));
  });
  it('requires the recipient to accept and hides relationships from unrelated members', () => {
    const d = world();
    expect(d.connect(alice.did, alice.did, 'request')).toMatchObject({
      ok: false,
      error: 'bad_request',
    });
    expect(d.connect(alice.did, outsider.did, 'request')).toMatchObject({
      ok: false,
      error: 'not_member',
    });
    expect(d.connect(alice.did, bob.did, 'request').ok).toBe(true);
    expect(d.connect(alice.did, bob.did, 'accept')).toMatchObject({
      ok: false,
      error: 'not_allowed',
    });
    expect(d.connections(fool.did)).toEqual({ ok: true, connections: [] });
    expect(d.connect(bob.did, alice.did, 'request').ok).toBe(true);
    expect(d.connections(bob.did)).toMatchObject({
      connections: [{ peer: alice.did, state: 'incoming' }],
    });
    expect(d.connect(bob.did, alice.did, 'accept').ok).toBe(true);
    expect(d.connections(alice.did)).toMatchObject({
      connections: [{ peer: bob.did, state: 'accepted' }],
    });
    d.connect(alice.did, bob.did, 'remove');
    expect(d.connections(bob.did)).toEqual({ ok: true, connections: [] });
  });
});

describe('discovery HTTP boundary', () => {
  it('rejects unauthenticated and unadmitted keys, malformed data and oversized requests', async () => {
    const env: Env = {
      AUTH_SECRET: 'discovery-test-secret-01234567890123456789',
      REGISTRY: testRegistry(fool.did).REGISTRY,
    };
    const call = (path: string, init?: RequestInit) =>
      worker.fetch(new Request(`https://tero.pherus.org${path}`, init), env);
    expect((await call('/api/discovery/members')).status).toBe(401);
    const login = async (identity: typeof fool) => {
      const { challenge } = (await (
        await call('/api/auth/challenge', { method: 'POST' })
      ).json()) as { challenge: string };
      const { token } = (await (
        await call('/api/auth/session', {
          method: 'POST',
          body: JSON.stringify({
            did: identity.did,
            challenge,
            signature: bytesToBase64Url(sign(signInMessage(challenge), identity.secretKey)),
          }),
        })
      ).json()) as { token: string };
      return { authorization: `Bearer ${token}` };
    };
    expect((await call('/api/discovery/members', { headers: await login(outsider) })).status).toBe(
      403,
    );
    const headers = await login(fool);
    const list = await call('/api/discovery/members', { headers });
    expect(list.status).toBe(200);
    expect((await call('/api/discovery/handle', { headers })).status).toBe(405);
    expect(
      (
        await call('/api/discovery/handle', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ directory: 'plain', handleTag: 'la-niina' }),
        })
      ).status,
    ).toBe(400);
    const key = randomBytes(32);
    await call('/api/discovery/grant', {
      method: 'PUT',
      headers,
      body: JSON.stringify(grantDirectoryKey(fool, fool.did, key)),
    });
    const available = await call('/api/discovery/handle', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        directory: directoryId(key),
        handleTag: directoryHandleTag(key, 'la-niina'),
      }),
    });
    expect(available.status).toBe(200);
    expect(available.headers.get('cache-control')).toBe('no-store');
    expect(await available.json()).toEqual({ available: true });
    expect(list.headers.get('cache-control')).toBe('no-store');
    expect(list.headers.get('x-content-type-options')).toBe('nosniff');
    expect((await call('/api/discovery/profile', { method: 'GET', headers })).status).toBe(405);
    expect(
      (
        await call('/api/discovery/profile', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ handle: 'plaintext', displayName: 'Plain Name' }),
        })
      ).status,
    ).toBe(400);
    expect(
      (await call('/api/discovery/grant', { method: 'PUT', headers, body: 'x'.repeat(13 * 1024) }))
        .status,
    ).toBe(400);
  });
});
