import { bytesToBase64Url, pseudonym, randomBytes } from '@tero/crypto';
import { skillsPerDay, type AidReply, type NewSkill, type Skill } from '@tero/protocol';
import type { Member, Result, Sql, SqlValue } from './registry';

/*
 * Skills and learning. Posts carry no name. Replies ("I'd like to learn this", "I can
 * teach you") go only to the author, as with mutual aid. Resources take no replies.
 */

export const skillSchema = [
  `CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    topic TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT NOT NULL,
    online INTEGER NOT NULL,
    country TEXT NOT NULL,
    link TEXT NOT NULL,
    author TEXT NOT NULL,
    added_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS skills_by_author ON skills (author, added_at)`,
  `CREATE TABLE IF NOT EXISTS skill_replies (
    id TEXT PRIMARY KEY,
    skill TEXT NOT NULL,
    responder TEXT NOT NULL,
    note TEXT NOT NULL,
    added_at INTEGER NOT NULL,
    UNIQUE (skill, responder)
  )`,
];

const dayMs = 24 * 60 * 60 * 1000;
const day = (t: number) => Math.floor(t / dayMs) * dayMs;

type SkillRow = Omit<Skill, 'online' | 'mine' | 'replies' | 'replied' | 'addedOn'> & {
  online: number;
  author: string;
  added_at: number;
  replies: number;
  replied: number;
};

type Fail = 'not_member' | 'not_found' | 'not_allowed';

export class SkillBoard {
  constructor(
    private readonly sql: Sql,
    private readonly member: (did: string) => Member | null,
    private readonly secret: string,
  ) {}

  private rows<T>(query: string, ...bindings: SqlValue[]): T[] {
    return this.sql.exec(query, ...bindings).toArray() as T[];
  }

  private author(did: string) {
    return pseudonym(this.secret, 'skill-author', did);
  }

  private responder(did: string) {
    return pseudonym(this.secret, 'skill-responder', did);
  }

  private skill(id: string) {
    return this.rows<{ author: string; kind: string }>(
      'SELECT author, kind FROM skills WHERE id = ?',
      id,
    )[0];
  }

  list(did: string): Result<{ skills: Skill[] }, 'not_member'> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    const author = this.author(did);
    const rows = this.rows<SkillRow>(
      `SELECT s.*,
         (SELECT COUNT(*) FROM skill_replies r WHERE r.skill = s.id) AS replies,
         EXISTS (SELECT 1 FROM skill_replies r WHERE r.skill = s.id AND r.responder = ?) AS replied
       FROM skills s ORDER BY s.added_at DESC LIMIT 300`,
      this.responder(did),
    );
    return {
      ok: true,
      skills: rows.map((row) => {
        const mine = row.author === author;
        return {
          id: row.id,
          kind: row.kind,
          topic: row.topic,
          title: row.title,
          details: row.details,
          online: row.online === 1,
          country: row.country,
          link: row.link,
          addedOn: day(row.added_at),
          mine,
          replies: mine ? row.replies : 0,
          replied: row.replied === 1,
        };
      }),
    };
  }

  add(
    did: string,
    skill: NewSkill,
    now: number,
  ): Result<{ id: string }, 'not_member' | 'rate_limited'> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    const author = this.author(did);
    const [{ n } = { n: 0 }] = this.rows<{ n: number }>(
      'SELECT COUNT(*) AS n FROM skills WHERE author = ? AND added_at > ?',
      author,
      now - dayMs,
    );
    if (n >= skillsPerDay) return { ok: false, error: 'rate_limited' };
    const id = bytesToBase64Url(randomBytes(12));
    this.sql.exec(
      `INSERT INTO skills (id, kind, topic, title, details, online, country, link, author, added_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      skill.kind,
      skill.topic,
      skill.title.trim(),
      skill.details.trim(),
      skill.online ? 1 : 0,
      skill.country,
      skill.link.trim(),
      author,
      now,
    );
    return { ok: true, id };
  }

  /** One reply per member, to teach or learn posts that aren't their own. */
  reply(did: string, id: string, note: string, now: number): Result<object, Fail | 'conflict'> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    const skill = this.skill(id);
    if (!skill) return { ok: false, error: 'not_found' };
    if (skill.kind === 'resource' || skill.author === this.author(did))
      return { ok: false, error: 'not_allowed' };
    const inserted = this.rows(
      `INSERT INTO skill_replies (id, skill, responder, note, added_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT DO NOTHING RETURNING id`,
      bytesToBase64Url(randomBytes(12)),
      id,
      this.responder(did),
      note.trim(),
      now,
    );
    return inserted.length ? { ok: true } : { ok: false, error: 'conflict' };
  }

  /** Replies, for the author only. */
  replies(did: string, id: string): Result<{ replies: AidReply[] }, Fail> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    const skill = this.skill(id);
    if (!skill) return { ok: false, error: 'not_found' };
    if (skill.author !== this.author(did)) return { ok: false, error: 'not_allowed' };
    const rows = this.rows<{ id: string; note: string; added_at: number }>(
      'SELECT id, note, added_at FROM skill_replies WHERE skill = ? ORDER BY added_at',
      id,
    );
    return {
      ok: true,
      replies: rows.map((r) => ({ id: r.id, note: r.note, addedOn: day(r.added_at) })),
    };
  }

  /** The author, the Fool or the council can take a post down, with its replies. */
  remove(did: string, id: string): Result<object, Fail> {
    const member = this.member(did);
    if (!member) return { ok: false, error: 'not_member' };
    const skill = this.skill(id);
    if (!skill) return { ok: false, error: 'not_found' };
    const moderator = member.role === 'fool' || member.role === 'council';
    if (skill.author !== this.author(did) && !moderator) return { ok: false, error: 'not_allowed' };
    this.sql.exec('DELETE FROM skill_replies WHERE skill = ?', id);
    this.sql.exec('DELETE FROM skills WHERE id = ?', id);
    return { ok: true };
  }
}
