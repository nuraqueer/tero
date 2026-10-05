import { bytesToBase64Url, randomBytes } from '@tero/crypto';
import type { NewSkill } from '@tero/protocol';
import { describe, expect, it } from 'vitest';
import { testRegistry } from './test-registry';

const fool = 'did:key:fool';
const teach: NewSkill = {
  kind: 'teach',
  topic: 'languages',
  title: 'Conversational French',
  details: 'One hour a week on video.',
  online: true,
  country: '',
  link: '',
};
const resource: NewSkill = {
  ...teach,
  kind: 'resource',
  title: 'Free web course',
  link: 'https://example.org/course',
};

function setup() {
  const { registry, clock } = testRegistry(fool);
  const join = (did: string) => {
    const id = bytesToBase64Url(randomBytes(32)).slice(0, 43);
    const nonce = bytesToBase64Url(randomBytes(16));
    registry.createCard(fool, { id, nonce, type: 'member' }, clock.now);
    registry.claimCard(did, id, clock.now);
    registry.approveCard(fool, id, did, clock.now);
  };
  join('did:key:ana');
  join('did:key:bo');
  const skills = registry.skills;
  const add = (skill = teach, did = 'did:key:ana') => {
    const r = skills.add(did, skill, clock.now);
    if (!r.ok) throw new Error(r.error);
    return r.id;
  };
  const list = (did: string) => {
    const r = skills.list(did);
    if (!r.ok) throw new Error(r.error);
    return r.skills;
  };
  return { skills, clock, add, list };
}

describe('skills', () => {
  it('shows posts to members without saying who posted', () => {
    const { add, list, skills } = setup();
    add();
    expect(list('did:key:ana')[0]).toMatchObject({ title: 'Conversational French', mine: true });
    expect(list('did:key:bo')[0]).toMatchObject({ mine: false, online: true });
    expect(JSON.stringify(list('did:key:bo'))).not.toContain('ana');
    expect(skills.list('did:key:stranger')).toEqual({ ok: false, error: 'not_member' });
  });

  it('sends replies only to the author, and none to resources', () => {
    const { add, list, skills, clock } = setup();
    const id = add();
    const res = add(resource);
    expect(skills.reply('did:key:bo', res, 'hi', clock.now)).toEqual({
      ok: false,
      error: 'not_allowed',
    });
    expect(skills.reply('did:key:ana', id, 'me', clock.now)).toEqual({
      ok: false,
      error: 'not_allowed',
    });
    expect(skills.reply('did:key:bo', id, 'I would love to learn', clock.now).ok).toBe(true);
    expect(skills.reply('did:key:bo', id, 'again', clock.now)).toEqual({
      ok: false,
      error: 'conflict',
    });
    expect(list('did:key:bo').find((s) => s.id === id)).toMatchObject({
      replied: true,
      replies: 0,
    });
    expect(skills.replies('did:key:bo', id)).toEqual({ ok: false, error: 'not_allowed' });
    const replies = skills.replies('did:key:ana', id);
    expect(replies.ok && replies.replies.map((r) => r.note)).toEqual(['I would love to learn']);
  });

  it('lets the author or the council remove a post, and limits posts a day', () => {
    const { add, list, skills, clock } = setup();
    const a = add();
    const b = add();
    add(resource);
    expect(skills.add('did:key:ana', teach, clock.now)).toEqual({
      ok: false,
      error: 'rate_limited',
    });
    expect(skills.remove('did:key:bo', a)).toEqual({ ok: false, error: 'not_allowed' });
    expect(skills.remove('did:key:ana', a).ok).toBe(true);
    expect(skills.remove(fool, b).ok).toBe(true);
    expect(list('did:key:ana')).toHaveLength(1);
  });
});
