import { bytesToBase64Url, randomBytes } from '@tero/crypto';
import { aidTtlMs, type NewAidPost } from '@tero/protocol';
import { describe, expect, it } from 'vitest';
import { testRegistry } from './test-registry';

const fool = 'did:key:fool';
const post: NewAidPost = {
  kind: 'request',
  category: 'rent',
  title: 'Short on rent',
  details: 'About 50 USD would cover this month.',
  country: 'KE',
  city: 'Mombasa',
};

function setup() {
  const t = testRegistry(fool);
  const { registry, clock } = t;
  const join = (did: string) => {
    const id = bytesToBase64Url(randomBytes(32)).slice(0, 43);
    const nonce = bytesToBase64Url(randomBytes(16));
    registry.createCard(fool, { id, nonce, type: 'member' }, clock.now);
    registry.claimCard(did, id, clock.now);
    registry.approveCard(fool, id, did, clock.now);
  };
  join('did:key:ana');
  join('did:key:bo');
  const aid = registry.aid;
  const add = (did = 'did:key:ana') => {
    const r = aid.add(did, post, clock.now);
    if (!r.ok) throw new Error(r.error);
    return r.id;
  };
  const list = (did: string) => {
    const r = aid.list(did, clock.now);
    if (!r.ok) throw new Error(r.error);
    return r.posts;
  };
  return { aid, clock, add, list };
}

describe('mutual aid', () => {
  it('shows posts to members without saying who posted', () => {
    const { add, list, aid, clock } = setup();
    add();
    expect(list('did:key:ana')[0]).toMatchObject({
      title: 'Short on rent',
      mine: true,
      open: true,
    });
    expect(list('did:key:bo')[0]).toMatchObject({ mine: false });
    expect(JSON.stringify(list('did:key:bo'))).not.toContain('ana');
    expect(aid.list('did:key:stranger', clock.now)).toEqual({ ok: false, error: 'not_member' });
  });

  it('sends replies only to the author, one each, never to yourself', () => {
    const { add, list, aid, clock } = setup();
    const id = add();
    expect(aid.reply('did:key:ana', id, 'me', clock.now)).toEqual({
      ok: false,
      error: 'not_allowed',
    });
    expect(aid.reply('did:key:bo', id, 'I can help. Signal: bo.01', clock.now).ok).toBe(true);
    expect(aid.reply('did:key:bo', id, 'again', clock.now)).toEqual({
      ok: false,
      error: 'conflict',
    });
    expect(list('did:key:bo')[0]).toMatchObject({ replied: true, replies: 0 });
    expect(list('did:key:ana')[0]).toMatchObject({ replies: 1 });
    expect(aid.replies('did:key:bo', id, clock.now)).toEqual({ ok: false, error: 'not_allowed' });
    const replies = aid.replies('did:key:ana', id, clock.now);
    expect(replies.ok && replies.replies.map((r) => r.note)).toEqual(['I can help. Signal: bo.01']);
  });

  it('closes a post: it leaves the board and takes no replies', () => {
    const { add, list, aid, clock } = setup();
    const id = add();
    expect(aid.close('did:key:bo', id)).toEqual({ ok: false, error: 'not_allowed' });
    expect(aid.close('did:key:ana', id).ok).toBe(true);
    expect(list('did:key:bo')).toHaveLength(0);
    expect(list('did:key:ana')[0]).toMatchObject({ open: false });
    expect(aid.reply('did:key:bo', id, 'hi', clock.now)).toEqual({
      ok: false,
      error: 'not_found',
    });
  });

  it('lets the author or the council remove a post', () => {
    const { add, aid, list } = setup();
    const a = add();
    const b = add();
    expect(aid.remove('did:key:bo', a)).toEqual({ ok: false, error: 'not_allowed' });
    expect(aid.remove('did:key:ana', a).ok).toBe(true);
    expect(aid.remove(fool, b).ok).toBe(true);
    expect(list('did:key:ana')).toHaveLength(0);
  });

  it('limits posts a day and deletes them after 30 days', () => {
    const { add, aid, list, clock } = setup();
    add();
    add();
    add();
    expect(aid.add('did:key:ana', post, clock.now)).toEqual({ ok: false, error: 'rate_limited' });
    clock.now += aidTtlMs + 1;
    expect(list('did:key:ana')).toHaveLength(0);
    expect(aid.add('did:key:ana', post, clock.now).ok).toBe(true);
  });
});
