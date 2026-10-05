import { bytesToBase64Url, pseudonym, randomBytes } from '@tero/crypto';
import { jobsPerDay, jobTtlMs, type Job, type NewJob } from '@tero/protocol';
import type { Member, Result, Sql, SqlValue } from './registry';

/* Openings shared by members. The poster is a keyed pseudonym, never their key. */

export const jobSchema = [
  `CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    organisation TEXT NOT NULL,
    details TEXT NOT NULL,
    remote INTEGER NOT NULL,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    pay TEXT NOT NULL,
    apply TEXT NOT NULL,
    author TEXT NOT NULL,
    added_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS jobs_by_author ON jobs (author, added_at)`,
];

const dayMs = 24 * 60 * 60 * 1000;

type JobRow = Omit<Job, 'remote' | 'mine' | 'addedOn'> & {
  remote: number;
  author: string;
  added_at: number;
};

export class JobBoard {
  constructor(
    private readonly sql: Sql,
    private readonly member: (did: string) => Member | null,
    private readonly secret: string,
  ) {}

  private rows<T>(query: string, ...bindings: SqlValue[]): T[] {
    return this.sql.exec(query, ...bindings).toArray() as T[];
  }

  private author(did: string) {
    return pseudonym(this.secret, 'job-author', did);
  }

  list(did: string, now: number): Result<{ jobs: Job[] }, 'not_member'> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    this.sql.exec('DELETE FROM jobs WHERE added_at <= ?', now - jobTtlMs);
    const author = this.author(did);
    const rows = this.rows<JobRow>('SELECT * FROM jobs ORDER BY added_at DESC LIMIT 300');
    return {
      ok: true,
      jobs: rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        organisation: row.organisation,
        details: row.details,
        remote: row.remote === 1,
        country: row.country,
        city: row.city,
        pay: row.pay,
        apply: row.apply,
        addedOn: Math.floor(row.added_at / dayMs) * dayMs,
        mine: row.author === author,
      })),
    };
  }

  add(
    did: string,
    job: NewJob,
    now: number,
  ): Result<{ id: string }, 'not_member' | 'rate_limited'> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    const author = this.author(did);
    const [{ n } = { n: 0 }] = this.rows<{ n: number }>(
      'SELECT COUNT(*) AS n FROM jobs WHERE author = ? AND added_at > ?',
      author,
      now - dayMs,
    );
    if (n >= jobsPerDay) return { ok: false, error: 'rate_limited' };
    const id = bytesToBase64Url(randomBytes(12));
    this.sql.exec(
      `INSERT INTO jobs (id, type, title, organisation, details, remote, country, city, pay,
         apply, author, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      job.type,
      job.title.trim(),
      job.organisation.trim(),
      job.details.trim(),
      job.remote ? 1 : 0,
      job.country,
      job.city.trim(),
      job.pay.trim(),
      job.apply.trim(),
      author,
      now,
    );
    return { ok: true, id };
  }

  /** The poster, the Fool or the council can take an opening down. */
  remove(did: string, id: string): Result<object, 'not_member' | 'not_found' | 'not_allowed'> {
    const member = this.member(did);
    if (!member) return { ok: false, error: 'not_member' };
    const [job] = this.rows<{ author: string }>('SELECT author FROM jobs WHERE id = ?', id);
    if (!job) return { ok: false, error: 'not_found' };
    const moderator = member.role === 'fool' || member.role === 'council';
    if (job.author !== this.author(did) && !moderator) return { ok: false, error: 'not_allowed' };
    this.sql.exec('DELETE FROM jobs WHERE id = ?', id);
    return { ok: true };
  }
}
