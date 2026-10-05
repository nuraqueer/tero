import { bytesToBase64Url, randomBytes } from '@tero/crypto';
import { jobTtlMs, type NewJob } from '@tero/protocol';
import { describe, expect, it } from 'vitest';
import { testRegistry } from './test-registry';

const fool = 'did:key:fool';
const job: NewJob = {
  type: 'freelance',
  title: 'Logo for a small bakery',
  organisation: '',
  details: 'Two concepts, one round of changes.',
  remote: true,
  country: '',
  city: '',
  pay: '150 USD',
  apply: 'Email hello@example.org',
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
  const jobs = registry.jobs;
  const add = (did = 'did:key:ana') => {
    const r = jobs.add(did, job, clock.now);
    if (!r.ok) throw new Error(r.error);
    return r.id;
  };
  const list = (did: string) => {
    const r = jobs.list(did, clock.now);
    if (!r.ok) throw new Error(r.error);
    return r.jobs;
  };
  return { jobs, clock, add, list };
}

describe('jobs', () => {
  it('shows openings to members without saying who shared them', () => {
    const { add, list, jobs, clock } = setup();
    add();
    expect(list('did:key:ana')[0]).toMatchObject({ title: 'Logo for a small bakery', mine: true });
    expect(list('did:key:bo')[0]).toMatchObject({ mine: false, remote: true, pay: '150 USD' });
    expect(JSON.stringify(list('did:key:bo'))).not.toContain('ana');
    expect(jobs.list('did:key:stranger', clock.now)).toEqual({ ok: false, error: 'not_member' });
  });

  it('lets the poster or the council remove an opening', () => {
    const { add, list, jobs } = setup();
    const a = add();
    const b = add();
    expect(jobs.remove('did:key:bo', a)).toEqual({ ok: false, error: 'not_allowed' });
    expect(jobs.remove('did:key:ana', a).ok).toBe(true);
    expect(jobs.remove(fool, b).ok).toBe(true);
    expect(list('did:key:ana')).toHaveLength(0);
  });

  it('limits openings a day and takes them down after 60 days', () => {
    const { add, list, jobs, clock } = setup();
    for (let i = 0; i < 5; i++) add();
    expect(jobs.add('did:key:ana', job, clock.now)).toEqual({ ok: false, error: 'rate_limited' });
    clock.now += jobTtlMs + 1;
    expect(list('did:key:ana')).toHaveLength(0);
    expect(jobs.add('did:key:ana', job, clock.now).ok).toBe(true);
  });
});
