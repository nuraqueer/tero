import { bytesToBase64Url, randomBytes } from '@tero/crypto';
import type { NewPlace } from '@tero/protocol';
import { describe, expect, it } from 'vitest';
import worker, { type Env } from './index';
import { testRegistry } from './test-registry';

const fool = 'did:key:fool';
const place: NewPlace = {
  part: 'affirming',
  name: 'Open Door Clinic',
  country: 'KE',
  city: 'Nairobi',
  offers: 'Hormone therapy and check-ups, no questions asked.',
  contact: '',
  cost: 'low',
  international: true,
  unaware: false,
};

function setup() {
  const t = testRegistry(fool);
  const { registry, clock } = t;
  // Seat a second member through a Tero card.
  const join = (did: string) => {
    const id = bytesToBase64Url(randomBytes(32)).slice(0, 43);
    const nonce = bytesToBase64Url(randomBytes(16));
    registry.createCard(fool, { id, nonce, type: 'member' }, clock.now);
    registry.claimCard(did, id, clock.now);
    registry.approveCard(fool, id, did, clock.now);
  };
  return { ...t, join };
}

describe('places', () => {
  it('lets members add and list places, and hides who added them', () => {
    const { registry, clock, join } = setup();
    join('did:key:ana');
    const added = registry.addPlace('did:key:ana', place, clock.now);
    expect(added.ok).toBe(true);

    const forAna = registry.listPlaces('did:key:ana', 'affirming', clock.now);
    const forFool = registry.listPlaces(fool, 'affirming', clock.now);
    if (!forAna.ok || !forFool.ok) throw new Error('list failed');
    expect(forAna.places).toHaveLength(1);
    expect(forAna.places[0]).toMatchObject({ name: 'Open Door Clinic', mine: true, vouches: 0 });
    expect(forFool.places[0]!.mine).toBe(false);
    expect(JSON.stringify(forFool.places)).not.toContain('ana');
    expect(registry.listPlaces(fool, 'legal', clock.now)).toEqual({ ok: true, places: [] });
  });

  it('refuses people who are not members', () => {
    const { registry, clock } = setup();
    expect(registry.addPlace('did:key:stranger', place, clock.now)).toEqual({
      ok: false,
      error: 'not_member',
    });
    expect(registry.listPlaces('did:key:stranger', 'affirming', clock.now).ok).toBe(false);
  });

  it('counts one vouch per member and never your own place', () => {
    const { registry, clock, join } = setup();
    join('did:key:ana');
    const added = registry.addPlace('did:key:ana', place, clock.now);
    if (!added.ok) throw new Error('add failed');
    expect(registry.vouchPlace('did:key:ana', added.id, true, clock.now)).toEqual({
      ok: false,
      error: 'not_allowed',
    });
    registry.vouchPlace(fool, added.id, true, clock.now);
    registry.vouchPlace(fool, added.id, true, clock.now);
    const list = registry.listPlaces(fool, 'affirming', clock.now);
    if (!list.ok) throw new Error('list failed');
    expect(list.places[0]).toMatchObject({ vouches: 1, vouched: true });
    registry.vouchPlace(fool, added.id, false, clock.now);
    const after = registry.listPlaces(fool, 'affirming', clock.now);
    if (!after.ok) throw new Error('list failed');
    expect(after.places[0]).toMatchObject({ vouches: 0, vouched: false });
  });

  it('lets the author or the council remove a place, nobody else', () => {
    const { registry, clock, join } = setup();
    join('did:key:ana');
    join('did:key:bo');
    const a = registry.addPlace('did:key:ana', place, clock.now);
    const b = registry.addPlace('did:key:ana', place, clock.now);
    if (!a.ok || !b.ok) throw new Error('add failed');
    expect(registry.removePlace('did:key:bo', a.id, clock.now)).toEqual({
      ok: false,
      error: 'not_allowed',
    });
    expect(registry.removePlace('did:key:ana', a.id, clock.now).ok).toBe(true);
    expect(registry.removePlace(fool, b.id, clock.now).ok).toBe(true);
    expect(registry.removePlace(fool, b.id, clock.now)).toEqual({ ok: false, error: 'not_found' });
  });

  it('limits how many places one member adds in a day', () => {
    const { registry, clock, join } = setup();
    join('did:key:ana');
    for (let i = 0; i < 10; i++)
      expect(registry.addPlace('did:key:ana', place, clock.now).ok).toBe(true);
    expect(registry.addPlace('did:key:ana', place, clock.now)).toEqual({
      ok: false,
      error: 'rate_limited',
    });
    clock.now += 24 * 60 * 60 * 1000 + 1;
    expect(registry.addPlace('did:key:ana', place, clock.now).ok).toBe(true);
  });

  it('checks requests at the API', async () => {
    const env: Env = {
      AUTH_SECRET: 'test-secret-0123456789abcdef0123456789',
      REGISTRY: testRegistry(fool).REGISTRY,
    };
    const call = (path: string, init?: RequestInit) =>
      worker.fetch(new Request(`https://tero.pherus.org${path}`, init), env);
    expect((await call('/api/places?part=affirming')).status).toBe(401);
  });
});
