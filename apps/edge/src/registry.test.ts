import { cardTtlMs, claimedCardTtlMs, openCardLimit } from '@tero/protocol';
import { describe, expect, it } from 'vitest';
import { Registry } from './registry';
import { memorySql } from './test-registry';

const fool = 'did:key:z6MkFool';
const newcomer = 'did:key:z6MkNew';
const id = (n: number) => String(n).padStart(43, 'i');
const nonce = 'n'.repeat(22);
const card = (n: number) => ({ id: id(n), nonce, type: 'member' as const });
const t0 = 1_800_000_000_000;

function setup() {
  return new Registry(memorySql(), fool);
}

describe('registry', () => {
  it('makes the founder a member at Sequence 0, and nobody else', () => {
    const reg = setup();
    expect(reg.member(fool, t0)).toEqual({ sequence: 0, arcana: 0 });
    expect(reg.member(newcomer, t0)).toBeNull();
    expect(new Registry(memorySql()).member(fool, t0)).toBeNull();
  });

  it('lets only members make cards', () => {
    const reg = setup();
    expect(reg.createCard(newcomer, card(1), t0)).toEqual({ ok: false, error: 'not_member' });
    const made = reg.createCard(fool, card(1), t0);
    expect(made).toMatchObject({ ok: true, card: { state: 'open', expiresAt: t0 + cardTtlMs } });
    expect(reg.createCard(fool, card(1), t0)).toEqual({ ok: false, error: 'conflict' });
  });

  it('runs the whole card from claim to approval', () => {
    const reg = setup();
    const made = reg.createCard(fool, card(1), t0);
    const arcana = made.ok ? made.card.arcana : -1;
    expect(reg.claimCard(newcomer, id(1), t0 + 1000)).toEqual({
      ok: true,
      id: id(1),
      expiresAt: t0 + 1000 + claimedCardTtlMs,
    });
    expect(reg.listCards(fool, t0 + 2000)).toMatchObject([{ state: 'claimed', claimer: newcomer }]);
    expect(reg.approveCard(fool, id(1), newcomer, t0 + 3000)).toEqual({
      ok: true,
      sequence: 9,
      arcana,
    });
    expect(reg.member(newcomer, t0)).toEqual({ sequence: 9, arcana });
    // The card is gone for good.
    expect(reg.listCards(fool, t0 + 4000)).toEqual([]);
    expect(reg.claimCard('did:key:z6MkOther', id(1), t0)).toEqual({
      ok: false,
      error: 'card_unavailable',
    });
  });

  it('lets only the first claim win', () => {
    const reg = setup();
    reg.createCard(fool, card(1), t0);
    expect(reg.claimCard(newcomer, id(1), t0).ok).toBe(true);
    expect(reg.claimCard('did:key:z6MkLate', id(1), t0)).toEqual({
      ok: false,
      error: 'card_unavailable',
    });
  });

  it('gives one answer for unknown, expired and own cards', () => {
    const reg = setup();
    reg.createCard(fool, card(1), t0);
    const unavailable = { ok: false, error: 'card_unavailable' };
    expect(reg.claimCard(newcomer, id(2), t0)).toEqual(unavailable);
    expect(reg.claimCard(newcomer, id(1), t0 + cardTtlMs)).toEqual(unavailable);
    reg.createCard(fool, card(3), t0);
    // The inviter is a member, so their own card says so; a non-member inviter can't exist.
    expect(reg.claimCard(fool, id(3), t0)).toEqual({ ok: false, error: 'already_member' });
  });

  it('allows one live claim per key', () => {
    const reg = setup();
    reg.createCard(fool, card(1), t0);
    reg.createCard(fool, card(2), t0);
    expect(reg.claimCard(newcomer, id(1), t0).ok).toBe(true);
    expect(reg.claimCard(newcomer, id(2), t0)).toEqual({ ok: false, error: 'card_unavailable' });
  });

  it('expires a claimed card that is not approved in time', () => {
    const reg = setup();
    reg.createCard(fool, card(1), t0);
    reg.claimCard(newcomer, id(1), t0);
    expect(reg.approveCard(fool, id(1), newcomer, t0 + claimedCardTtlMs)).toEqual({
      ok: false,
      error: 'not_found',
    });
    expect(reg.member(newcomer, t0)).toBeNull();
  });

  it('approves only the key the inviter checked, and only for the inviter', () => {
    const reg = setup();
    reg.createCard(fool, card(1), t0);
    reg.claimCard(newcomer, id(1), t0);
    expect(reg.approveCard(fool, id(1), 'did:key:z6MkWrong', t0)).toEqual({
      ok: false,
      error: 'conflict',
    });
    expect(reg.approveCard(newcomer, id(1), newcomer, t0)).toEqual({
      ok: false,
      error: 'not_found',
    });
    expect(reg.member(newcomer, t0)).toBeNull();
  });

  it('lets the inviter destroy a card', () => {
    const reg = setup();
    reg.createCard(fool, card(1), t0);
    reg.claimCard(newcomer, id(1), t0);
    expect(reg.destroyCard(newcomer, id(1))).toEqual({ ok: false, error: 'not_found' });
    expect(reg.destroyCard(fool, id(1))).toEqual({ ok: true });
    expect(reg.listCards(fool, t0)).toEqual([]);
    expect(reg.destroyCard(fool, id(1))).toEqual({ ok: false, error: 'not_found' });
  });

  it('limits open cards by Sequence', () => {
    const reg = setup();
    reg.createCard(fool, card(1), t0);
    reg.claimCard(newcomer, id(1), t0);
    reg.approveCard(fool, id(1), newcomer, t0);
    for (let n = 0; n < openCardLimit(9); n++)
      expect(reg.createCard(newcomer, card(10 + n), t0).ok).toBe(true);
    expect(reg.createCard(newcomer, card(99), t0)).toEqual({ ok: false, error: 'card_limit' });
    // Expired cards stop counting.
    expect(reg.createCard(newcomer, card(99), t0 + cardTtlMs).ok).toBe(true);
  });
});

describe('the Fool seat', () => {
  it('is open until the first member, given once, then closed for good', () => {
    const registry = new Registry(memorySql());
    expect(registry.founderSeatOpen()).toBe(true);
    expect(registry.claimFounder('did:key:first', 1)).toEqual({ ok: true, sequence: 0 });
    expect(registry.member('did:key:first', 2)).toEqual({ sequence: 0, arcana: 0 });
    expect(registry.founderSeatOpen()).toBe(false);
    expect(registry.claimFounder('did:key:second', 3)).toEqual({
      ok: false,
      error: 'founder_taken',
    });
    expect(registry.claimFounder('did:key:first', 4)).toEqual({
      ok: false,
      error: 'founder_taken',
    });
  });

  it('only lets FOUNDER_DID take the seat when it is set', () => {
    const registry = new Registry(memorySql(), 'did:key:fool');
    expect(registry.claimFounder('did:key:someone', 1)).toEqual({
      ok: false,
      error: 'founder_taken',
    });
    expect(registry.claimFounder('did:key:fool', 2)).toEqual({ ok: true, sequence: 0 });
  });
});

describe('card names', () => {
  it("never draws the Fool or the giver's own card", () => {
    for (let n = 0; n < 40; n++) {
      const reg = setup();
      reg.createCard(fool, card(1), t0);
      reg.claimCard(newcomer, id(1), t0);
      reg.approveCard(fool, id(1), newcomer, t0);
      const giver = reg.member(newcomer, t0)!.arcana!;
      expect(giver).toBeGreaterThan(0);
      const made = reg.createCard(newcomer, card(2), t0);
      expect(made.ok && made.card.arcana).not.toBe(giver);
      expect(made.ok && made.card.arcana).toBeGreaterThan(0);
    }
  });

  it('gives existing rows a card when the column is added', () => {
    const sql = memorySql();
    sql.exec(
      'CREATE TABLE members (did TEXT PRIMARY KEY, sequence INTEGER NOT NULL, joined_at INTEGER NOT NULL)',
    );
    sql.exec("INSERT INTO members VALUES ('did:key:old', 0, 1)");
    expect(new Registry(sql).member('did:key:old', 2)).toEqual({ sequence: 0, arcana: 0 });
  });
});
