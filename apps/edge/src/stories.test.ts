import { bytesToBase64Url, randomBytes } from '@tero/crypto';
import type { NewStory } from '@tero/protocol';
import { describe, expect, it } from 'vitest';
import { testRegistry } from './test-registry';

const fool = 'did:key:fool';
const story: NewStory = {
  topic: 'family',
  title: 'Telling my sister',
  text: 'It went better than I feared.',
  warning: '',
  country: '',
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
  const stories = registry.stories;
  const add = (did = 'did:key:ana') => {
    const r = stories.add(did, story, clock.now);
    if (!r.ok) throw new Error(r.error);
    return r.id;
  };
  const list = (did: string) => {
    const r = stories.list(did);
    if (!r.ok) throw new Error(r.error);
    return r.stories;
  };
  return { stories, clock, add, list };
}

describe('stories', () => {
  it('shows stories to members without the teller, dated by month only', () => {
    const { add, list, stories } = setup();
    add();
    const [mine] = list('did:key:ana');
    expect(mine).toMatchObject({ title: 'Telling my sister', mine: true });
    expect(new Date(mine!.addedOn).getUTCDate()).toBe(1);
    expect(list('did:key:bo')[0]).toMatchObject({ mine: false });
    expect(JSON.stringify(list('did:key:bo'))).not.toContain('ana');
    expect(stories.list('did:key:stranger')).toEqual({ ok: false, error: 'not_member' });
  });

  it('counts one thank-you per member, never your own', () => {
    const { add, list, stories } = setup();
    const id = add();
    expect(stories.thank('did:key:ana', id, true)).toEqual({ ok: false, error: 'not_allowed' });
    stories.thank('did:key:bo', id, true);
    stories.thank('did:key:bo', id, true);
    stories.thank(fool, id, true);
    expect(list('did:key:bo')[0]).toMatchObject({ thanks: 2, thanked: true });
    stories.thank('did:key:bo', id, false);
    expect(list('did:key:bo')[0]).toMatchObject({ thanks: 1, thanked: false });
  });

  it('lets the teller or the council remove a story, and limits stories a day', () => {
    const { add, list, stories, clock } = setup();
    const a = add();
    const b = add();
    expect(stories.add('did:key:ana', story, clock.now)).toEqual({
      ok: false,
      error: 'rate_limited',
    });
    expect(stories.remove('did:key:bo', a)).toEqual({ ok: false, error: 'not_allowed' });
    expect(stories.remove('did:key:ana', a).ok).toBe(true);
    expect(stories.remove(fool, b).ok).toBe(true);
    expect(list('did:key:ana')).toHaveLength(0);
  });
});
