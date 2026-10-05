import { bytesToBase64Url, pseudonym, randomBytes } from '@tero/crypto';
import { storiesPerDay, type NewStory, type Story } from '@tero/protocol';
import type { Member, Result, Sql, SqlValue } from './registry';

/* Stories members share. The teller and those who say thanks are keyed pseudonyms. */

export const storySchema = [
  `CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    warning TEXT NOT NULL,
    country TEXT NOT NULL,
    author TEXT NOT NULL,
    added_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS stories_by_author ON stories (author, added_at)`,
  `CREATE TABLE IF NOT EXISTS story_thanks (
    story TEXT NOT NULL,
    reader TEXT NOT NULL,
    PRIMARY KEY (story, reader)
  )`,
];

const dayMs = 24 * 60 * 60 * 1000;

/** The first day of the month, UTC. */
function month(t: number): number {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

type StoryRow = Omit<Story, 'mine' | 'addedOn' | 'thanked'> & {
  author: string;
  added_at: number;
  thanked: number;
};

type Fail = 'not_member' | 'not_found' | 'not_allowed';

export class StoryBoard {
  constructor(
    private readonly sql: Sql,
    private readonly member: (did: string) => Member | null,
    private readonly secret: string,
  ) {}

  private rows<T>(query: string, ...bindings: SqlValue[]): T[] {
    return this.sql.exec(query, ...bindings).toArray() as T[];
  }

  private author(did: string) {
    return pseudonym(this.secret, 'story-author', did);
  }

  private reader(did: string) {
    return pseudonym(this.secret, 'story-reader', did);
  }

  private authorOf(id: string) {
    return this.rows<{ author: string }>('SELECT author FROM stories WHERE id = ?', id)[0]?.author;
  }

  list(did: string): Result<{ stories: Story[] }, 'not_member'> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    const author = this.author(did);
    const rows = this.rows<StoryRow>(
      `SELECT s.*,
         (SELECT COUNT(*) FROM story_thanks t WHERE t.story = s.id) AS thanks,
         EXISTS (SELECT 1 FROM story_thanks t WHERE t.story = s.id AND t.reader = ?) AS thanked
       FROM stories s ORDER BY s.added_at DESC LIMIT 300`,
      this.reader(did),
    );
    return {
      ok: true,
      stories: rows.map((row) => ({
        id: row.id,
        topic: row.topic,
        title: row.title,
        text: row.text,
        warning: row.warning,
        country: row.country,
        addedOn: month(row.added_at),
        thanks: row.thanks,
        thanked: row.thanked === 1,
        mine: row.author === author,
      })),
    };
  }

  add(
    did: string,
    story: NewStory,
    now: number,
  ): Result<{ id: string }, 'not_member' | 'rate_limited'> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    const author = this.author(did);
    const [{ n } = { n: 0 }] = this.rows<{ n: number }>(
      'SELECT COUNT(*) AS n FROM stories WHERE author = ? AND added_at > ?',
      author,
      now - dayMs,
    );
    if (n >= storiesPerDay) return { ok: false, error: 'rate_limited' };
    const id = bytesToBase64Url(randomBytes(12));
    this.sql.exec(
      `INSERT INTO stories (id, topic, title, text, warning, country, author, added_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      story.topic,
      story.title.trim(),
      story.text.trim(),
      story.warning.trim(),
      story.country,
      author,
      now,
    );
    return { ok: true, id };
  }

  /** "Thank you for sharing", or taking it back. Never for your own story. */
  thank(did: string, id: string, thanks: boolean): Result<object, Fail> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    const author = this.authorOf(id);
    if (!author) return { ok: false, error: 'not_found' };
    if (author === this.author(did)) return { ok: false, error: 'not_allowed' };
    if (thanks) {
      this.sql.exec(
        'INSERT INTO story_thanks (story, reader) VALUES (?, ?) ON CONFLICT DO NOTHING',
        id,
        this.reader(did),
      );
    } else {
      this.sql.exec(
        'DELETE FROM story_thanks WHERE story = ? AND reader = ?',
        id,
        this.reader(did),
      );
    }
    return { ok: true };
  }

  /** The teller, the Fool or the council can take a story down. */
  remove(did: string, id: string): Result<object, Fail> {
    const member = this.member(did);
    if (!member) return { ok: false, error: 'not_member' };
    const author = this.authorOf(id);
    if (!author) return { ok: false, error: 'not_found' };
    const moderator = member.role === 'fool' || member.role === 'council';
    if (author !== this.author(did) && !moderator) return { ok: false, error: 'not_allowed' };
    this.sql.exec('DELETE FROM story_thanks WHERE story = ?', id);
    this.sql.exec('DELETE FROM stories WHERE id = ?', id);
    return { ok: true };
  }
}
