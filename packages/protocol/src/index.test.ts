import { describe, expect, it } from 'vitest';
import {
  cardUrl,
  drawArcana,
  isApproveCardRequest,
  isNewAidPost,
  isNewAidReply,
  isNewJob,
  isNewStory,
  isNewPlace,
  isClaimCardRequest,
  isCreateCardRequest,
  isSignInRequest,
  openCardLimit,
  signInMessage,
  tokenFromCardLink,
} from './index';

describe('protocol', () => {
  it('prefixes the sign-in message', () => {
    expect(new TextDecoder().decode(signInMessage('abc'))).toBe('tero-sign-in/v1\nabc');
  });

  it('checks sign-in requests', () => {
    expect(isSignInRequest({ did: 'did:key:z6Mk', challenge: 'c', signature: 's' })).toBe(true);
    expect(isSignInRequest({ did: 'did:key:z6Mk', challenge: 'c' })).toBe(false);
    expect(isSignInRequest({ did: 1, challenge: 'c', signature: 's' })).toBe(false);
    expect(isSignInRequest({ did: 'x'.repeat(500), challenge: 'c', signature: 's' })).toBe(false);
    expect(isSignInRequest(null)).toBe(false);
  });
});

describe('card links', () => {
  const token = 'abcdefghijklmnopqrstuv';

  it('finds the token in links and bare text', () => {
    expect(tokenFromCardLink(`https://tero.pherus.org/c/${token}`)).toBe(token);
    expect(tokenFromCardLink(`  https://tero.pherus.org/c/${token}/?x=1 `)).toBe(token);
    expect(tokenFromCardLink(token)).toBe(token);
    expect(cardUrl('https://tero.pherus.org', token)).toBe(`https://tero.pherus.org/c/${token}`);
  });

  it('ignores anything else', () => {
    expect(tokenFromCardLink('https://tero.pherus.org/c/short')).toBeNull();
    expect(tokenFromCardLink(`https://tero.pherus.org/c/${token}x`)).toBeNull();
    expect(tokenFromCardLink('hello')).toBeNull();
  });

  it('checks card requests', () => {
    const id = 'a'.repeat(43);
    expect(isCreateCardRequest({ id, nonce: token, type: 'member' })).toBe(true);
    expect(isCreateCardRequest({ id, nonce: token, type: 'council' })).toBe(true);
    expect(isCreateCardRequest({ id, nonce: token, type: 'admin' })).toBe(false);
    expect(isClaimCardRequest({ token, adult: true })).toBe(true);
    expect(isClaimCardRequest({ token, adult: false })).toBe(false);
    expect(isApproveCardRequest({ claimer: 'did:key:z6Mk', adult: true })).toBe(true);
    expect(isApproveCardRequest({ claimer: 'did:key:z6Mk' })).toBe(false);
  });

  it('allows fewer open cards at newer Sequences', () => {
    expect(openCardLimit(9)).toBe(1);
    expect(openCardLimit(0)).toBeGreaterThan(openCardLimit(1));
    for (let s = 1; s <= 9; s++) expect(openCardLimit(s)).toBeLessThanOrEqual(openCardLimit(s - 1));
  });
});

describe('drawArcana', () => {
  it("can draw every card but the Fool and the giver's", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 20; i++) seen.add(drawArcana(7, () => i / 20));
    expect(seen.size).toBe(20);
    expect(seen.has(0)).toBe(false);
    expect(seen.has(7)).toBe(false);
    expect(drawArcana(null, () => 0.999)).toBe(21);
  });
});

describe('isNewPlace', () => {
  const place = {
    part: 'legal',
    name: 'Rights Desk',
    country: 'UG',
    city: 'Kampala',
    offers: 'Free legal aid.',
    contact: '',
    cost: 'free',
    international: false,
    unaware: true,
  };
  it('accepts a well-formed place', () => expect(isNewPlace(place)).toBe(true));
  it('refuses unknown parts, bad countries, blank names and long text', () => {
    expect(isNewPlace({ ...place, part: 'jobs' })).toBe(false);
    expect(isNewPlace({ ...place, country: 'uganda' })).toBe(false);
    expect(isNewPlace({ ...place, name: '   ' })).toBe(false);
    expect(isNewPlace({ ...place, offers: 'x'.repeat(401) })).toBe(false);
    expect(isNewPlace({ ...place, cost: 'cheap' })).toBe(false);
  });
});

describe('isNewAidPost', () => {
  const post = {
    kind: 'request',
    category: 'rent',
    title: 'Short on rent this month',
    details: 'About 50 USD would cover it.',
    country: 'KE',
    city: 'Mombasa',
  };
  it('accepts a well-formed post', () => expect(isNewAidPost(post)).toBe(true));
  it('refuses bad kinds, categories and blank text', () => {
    expect(isNewAidPost({ ...post, kind: 'sale' })).toBe(false);
    expect(isNewAidPost({ ...post, category: 'cars' })).toBe(false);
    expect(isNewAidPost({ ...post, title: ' ' })).toBe(false);
    expect(isNewAidPost({ ...post, country: 'ke' })).toBe(false);
  });
  it('checks replies', () => {
    expect(isNewAidReply({ note: 'I can help, Signal: x' })).toBe(true);
    expect(isNewAidReply({ note: '' })).toBe(false);
    expect(isNewAidReply({ note: 'x'.repeat(301) })).toBe(false);
  });
});

describe('isNewJob', () => {
  const job = {
    type: 'job',
    title: 'Front-end developer',
    organisation: '',
    details: 'React and TypeScript, part time.',
    remote: true,
    country: '',
    city: '',
    pay: '',
    apply: 'jobs@example.org',
  };
  it('accepts remote work without a country', () => expect(isNewJob(job)).toBe(true));
  it('needs a country for work on site', () => {
    expect(isNewJob({ ...job, remote: false })).toBe(false);
    expect(isNewJob({ ...job, remote: false, country: 'NG' })).toBe(true);
  });
  it('refuses unknown types and missing ways to apply', () => {
    expect(isNewJob({ ...job, type: 'gig' })).toBe(false);
    expect(isNewJob({ ...job, apply: '' })).toBe(false);
    expect(isNewJob({ ...job, details: 'x'.repeat(801) })).toBe(false);
  });
});

describe('isNewStory', () => {
  const story = {
    topic: 'family',
    title: 'Telling my sister',
    text: 'It went better than I feared.',
    warning: '',
    country: '',
  };
  it('accepts a story without a country', () => expect(isNewStory(story)).toBe(true));
  it('refuses unknown topics, bad countries and empty text', () => {
    expect(isNewStory({ ...story, topic: 'gossip' })).toBe(false);
    expect(isNewStory({ ...story, country: 'Kenya' })).toBe(false);
    expect(isNewStory({ ...story, text: '' })).toBe(false);
    expect(isNewStory({ ...story, text: 'x'.repeat(4001) })).toBe(false);
  });
});
