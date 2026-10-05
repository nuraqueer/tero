import {
  claimedCardTtlMs,
  cardTtlMs,
  openCardLimit,
  type CardSummary,
  type CreateCardRequest,
} from '@tero/protocol';

/*
 * Members and Tero cards. The logic is synchronous on purpose: inside the Durable
 * Object each call runs to the end before the next starts, so "the first person to
 * scan claims the card" holds even when two people scan at once.
 *
 * What is kept: each member's key and Sequence, and live cards. When a card is
 * approved it is deleted, and who invited whom is not stored here. The encrypted
 * invite tree comes with the council tools.
 */

export type SqlValue = string | number | null;
export interface Sql {
  exec(query: string, ...bindings: SqlValue[]): { toArray(): Record<string, SqlValue>[] };
}

export type Result<T, E extends string> = ({ ok: true } & T) | { ok: false; error: E };

/** New members start at Sequence 9. */
export const newMemberSequence = 9;

const schema = [
  `CREATE TABLE IF NOT EXISTS members (
    did TEXT PRIMARY KEY,
    sequence INTEGER NOT NULL,
    joined_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    nonce TEXT NOT NULL,
    inviter TEXT NOT NULL,
    type TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    claimer TEXT UNIQUE,
    claimed_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS cards_by_inviter ON cards (inviter)`,
];

type CardRow = {
  id: string;
  nonce: string;
  inviter: string;
  type: 'member';
  expires_at: number;
  claimer: string | null;
};

function summary(row: CardRow): CardSummary {
  return {
    id: row.id,
    nonce: row.nonce,
    type: row.type,
    state: row.claimer ? 'claimed' : 'open',
    expiresAt: row.expires_at,
    claimer: row.claimer,
  };
}

export class Registry {
  constructor(
    private readonly sql: Sql,
    /** The Fool's did:key. They become a member the first time they are looked up. */
    private readonly founder?: string,
  ) {
    for (const statement of schema) sql.exec(statement);
  }

  private rows<T>(query: string, ...bindings: SqlValue[]): T[] {
    return this.sql.exec(query, ...bindings).toArray() as T[];
  }

  private prune(now: number) {
    this.sql.exec('DELETE FROM cards WHERE expires_at <= ?', now);
  }

  member(did: string, now: number): { sequence: number } | null {
    const [row] = this.rows<{ sequence: number }>(
      'SELECT sequence FROM members WHERE did = ?',
      did,
    );
    if (row) return { sequence: row.sequence };
    if (this.founder && did === this.founder) {
      this.sql.exec('INSERT INTO members (did, sequence, joined_at) VALUES (?, 0, ?)', did, now);
      return { sequence: 0 };
    }
    return null;
  }

  listCards(inviter: string, now: number): CardSummary[] {
    this.prune(now);
    return this.rows<CardRow>(
      'SELECT * FROM cards WHERE inviter = ? ORDER BY expires_at',
      inviter,
    ).map(summary);
  }

  createCard(
    inviter: string,
    card: CreateCardRequest,
    now: number,
  ): Result<{ card: CardSummary }, 'not_member' | 'card_limit' | 'conflict'> {
    const member = this.member(inviter, now);
    if (!member) return { ok: false, error: 'not_member' };
    this.prune(now);
    const [{ count } = { count: 0 }] = this.rows<{ count: number }>(
      'SELECT COUNT(*) AS count FROM cards WHERE inviter = ?',
      inviter,
    );
    if (count >= openCardLimit(member.sequence)) return { ok: false, error: 'card_limit' };
    const [row] = this.rows<CardRow>(
      `INSERT INTO cards (id, nonce, inviter, type, expires_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT DO NOTHING RETURNING *`,
      card.id,
      card.nonce,
      inviter,
      card.type,
      now + cardTtlMs,
    );
    return row ? { ok: true, card: summary(row) } : { ok: false, error: 'conflict' };
  }

  /** The first claim wins. Unknown, used, expired and own cards all give the same answer. */
  claimCard(
    claimer: string,
    id: string,
    now: number,
  ): Result<{ id: string; expiresAt: number }, 'card_unavailable' | 'already_member'> {
    if (this.member(claimer, now)) return { ok: false, error: 'already_member' };
    this.prune(now);
    // One live claim per key.
    if (this.rows('SELECT id FROM cards WHERE claimer = ?', claimer).length > 0) {
      return { ok: false, error: 'card_unavailable' };
    }
    const [row] = this.rows<{ expires_at: number }>(
      `UPDATE cards SET claimer = ?, claimed_at = ?, expires_at = MIN(expires_at, ?)
       WHERE id = ? AND claimer IS NULL AND inviter != ? RETURNING expires_at`,
      claimer,
      now,
      now + claimedCardTtlMs,
      id,
      claimer,
    );
    return row
      ? { ok: true, id, expiresAt: row.expires_at }
      : { ok: false, error: 'card_unavailable' };
  }

  /** Makes the claimer a member and destroys the card. */
  approveCard(
    inviter: string,
    id: string,
    claimer: string,
    now: number,
  ): Result<{ sequence: number }, 'not_found' | 'conflict'> {
    this.prune(now);
    const [card] = this.rows<CardRow>(
      'SELECT * FROM cards WHERE id = ? AND inviter = ?',
      id,
      inviter,
    );
    if (!card) return { ok: false, error: 'not_found' };
    // Approve only the person the inviter checked the code with.
    if (card.claimer !== claimer) return { ok: false, error: 'conflict' };
    this.sql.exec('DELETE FROM cards WHERE id = ?', id);
    this.sql.exec(
      'INSERT INTO members (did, sequence, joined_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
      claimer,
      newMemberSequence,
      now,
    );
    return { ok: true, sequence: newMemberSequence };
  }

  /** Destroys a card, claimed or not. */
  destroyCard(inviter: string, id: string): Result<object, 'not_found'> {
    const deleted = this.rows(
      'DELETE FROM cards WHERE id = ? AND inviter = ? RETURNING id',
      id,
      inviter,
    );
    return deleted.length ? { ok: true } : { ok: false, error: 'not_found' };
  }
}
