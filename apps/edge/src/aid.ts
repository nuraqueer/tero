import { bytesToBase64Url, pseudonym, randomBytes } from '@tero/crypto';
import {
  aidPostsPerDay,
  aidTtlMs,
  type AidPost,
  type AidReply,
  type NewAidPost,
} from '@tero/protocol';
import type { Member, Result, Sql, SqlValue } from './registry';

/*
 * Mutual aid. Posts carry no name: the author is a keyed pseudonym. Replies are seen
 * only by the author, and the person replying writes in the note whatever they choose
 * to share (until private chats exist, that's how two people reach each other).
 */

export const aidSchema = [
  `CREATE TABLE IF NOT EXISTS aid_posts (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    open INTEGER NOT NULL DEFAULT 1,
    author TEXT NOT NULL,
    added_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS aid_by_author ON aid_posts (author, added_at)`,
  `CREATE TABLE IF NOT EXISTS aid_replies (
    id TEXT PRIMARY KEY,
    post TEXT NOT NULL,
    responder TEXT NOT NULL,
    note TEXT NOT NULL,
    added_at INTEGER NOT NULL,
    UNIQUE (post, responder)
  )`,
];

const dayMs = 24 * 60 * 60 * 1000;
const day = (t: number) => Math.floor(t / dayMs) * dayMs;

type PostRow = Omit<AidPost, 'open' | 'mine' | 'replies' | 'replied' | 'addedOn'> & {
  open: number;
  author: string;
  added_at: number;
  replies: number;
  replied: number;
};

type Fail = 'not_member' | 'not_found' | 'not_allowed';

export class AidBoard {
  constructor(
    private readonly sql: Sql,
    private readonly member: (did: string) => Member | null,
    private readonly secret: string,
  ) {}

  private rows<T>(query: string, ...bindings: SqlValue[]): T[] {
    return this.sql.exec(query, ...bindings).toArray() as T[];
  }

  private author(did: string) {
    return pseudonym(this.secret, 'aid-author', did);
  }

  private responder(did: string) {
    return pseudonym(this.secret, 'aid-responder', did);
  }

  /** Expired posts and their replies are deleted, not kept. */
  private prune(now: number) {
    this.sql.exec(
      'DELETE FROM aid_replies WHERE post IN (SELECT id FROM aid_posts WHERE added_at <= ?)',
      now - aidTtlMs,
    );
    this.sql.exec('DELETE FROM aid_posts WHERE added_at <= ?', now - aidTtlMs);
  }

  private post(id: string) {
    return this.rows<{ author: string; open: number }>(
      'SELECT author, open FROM aid_posts WHERE id = ?',
      id,
    )[0];
  }

  /** Open posts, plus the asker's own closed ones. */
  list(did: string, now: number): Result<{ posts: AidPost[] }, 'not_member'> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    this.prune(now);
    const author = this.author(did);
    const rows = this.rows<PostRow>(
      `SELECT p.*,
         (SELECT COUNT(*) FROM aid_replies r WHERE r.post = p.id) AS replies,
         EXISTS (SELECT 1 FROM aid_replies r WHERE r.post = p.id AND r.responder = ?) AS replied
       FROM aid_posts p WHERE p.open = 1 OR p.author = ?
       ORDER BY p.added_at DESC LIMIT 300`,
      this.responder(did),
      author,
    );
    return {
      ok: true,
      posts: rows.map((row) => {
        const mine = row.author === author;
        return {
          id: row.id,
          kind: row.kind,
          category: row.category,
          title: row.title,
          details: row.details,
          country: row.country,
          city: row.city,
          open: row.open === 1,
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
    post: NewAidPost,
    now: number,
  ): Result<{ id: string }, 'not_member' | 'rate_limited'> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    const author = this.author(did);
    const [{ n } = { n: 0 }] = this.rows<{ n: number }>(
      'SELECT COUNT(*) AS n FROM aid_posts WHERE author = ? AND added_at > ?',
      author,
      now - dayMs,
    );
    if (n >= aidPostsPerDay) return { ok: false, error: 'rate_limited' };
    const id = bytesToBase64Url(randomBytes(12));
    this.sql.exec(
      `INSERT INTO aid_posts (id, kind, category, title, details, country, city, author, added_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      post.kind,
      post.category,
      post.title.trim(),
      post.details.trim(),
      post.country,
      post.city.trim(),
      author,
      now,
    );
    return { ok: true, id };
  }

  /** One reply per member per post, to open posts that aren't their own. */
  reply(did: string, id: string, note: string, now: number): Result<object, Fail | 'conflict'> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    this.prune(now);
    const post = this.post(id);
    if (!post || post.open !== 1) return { ok: false, error: 'not_found' };
    if (post.author === this.author(did)) return { ok: false, error: 'not_allowed' };
    const inserted = this.rows(
      `INSERT INTO aid_replies (id, post, responder, note, added_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT DO NOTHING RETURNING id`,
      bytesToBase64Url(randomBytes(12)),
      id,
      this.responder(did),
      note.trim(),
      now,
    );
    return inserted.length ? { ok: true } : { ok: false, error: 'conflict' };
  }

  /** Replies to a post, for its author only. */
  replies(did: string, id: string, now: number): Result<{ replies: AidReply[] }, Fail> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    this.prune(now);
    const post = this.post(id);
    if (!post) return { ok: false, error: 'not_found' };
    if (post.author !== this.author(did)) return { ok: false, error: 'not_allowed' };
    const rows = this.rows<{ id: string; note: string; added_at: number }>(
      'SELECT id, note, added_at FROM aid_replies WHERE post = ? ORDER BY added_at',
      id,
    );
    return {
      ok: true,
      replies: rows.map((r) => ({ id: r.id, note: r.note, addedOn: day(r.added_at) })),
    };
  }

  /** The author marks it done: it leaves the board, and no more replies come. */
  close(did: string, id: string): Result<object, Fail> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    const post = this.post(id);
    if (!post) return { ok: false, error: 'not_found' };
    if (post.author !== this.author(did)) return { ok: false, error: 'not_allowed' };
    this.sql.exec('UPDATE aid_posts SET open = 0 WHERE id = ?', id);
    return { ok: true };
  }

  /** The author, the Fool or the council can take a post down, with its replies. */
  remove(did: string, id: string): Result<object, Fail> {
    const member = this.member(did);
    if (!member) return { ok: false, error: 'not_member' };
    const post = this.post(id);
    if (!post) return { ok: false, error: 'not_found' };
    const moderator = member.role === 'fool' || member.role === 'council';
    if (post.author !== this.author(did) && !moderator) return { ok: false, error: 'not_allowed' };
    this.sql.exec('DELETE FROM aid_replies WHERE post = ?', id);
    this.sql.exec('DELETE FROM aid_posts WHERE id = ?', id);
    return { ok: true };
  }
}
