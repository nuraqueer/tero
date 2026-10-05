import { bytesToBase64Url, pseudonym, randomBytes } from '@tero/crypto';
import { AidBoard, aidSchema } from './aid';
import { JobBoard, jobSchema } from './jobs';
import {
  claimedCardTtlMs,
  cardTtlMs,
  councilSequence,
  drawArcana,
  foolArcana,
  openCardLimit,
  type CardSummary,
  type CreateCardRequest,
  type DirectoryPart,
  type NewPlace,
  type Place,
  type Role,
  placesPerDay,
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
  // Places in the directory. author is a pseudonym, not the member's key.
  `CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY,
    part TEXT NOT NULL,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    offers TEXT NOT NULL,
    contact TEXT NOT NULL,
    cost TEXT NOT NULL,
    international INTEGER NOT NULL,
    unaware INTEGER NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    author TEXT NOT NULL,
    added_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS places_by_part ON places (part, country)`,
  `CREATE INDEX IF NOT EXISTS places_by_author ON places (author, added_at)`,
  // "I've been, it went well": one per member per place, again under a pseudonym.
  `CREATE TABLE IF NOT EXISTS place_vouches (
    place TEXT NOT NULL,
    voucher TEXT NOT NULL,
    PRIMARY KEY (place, voucher)
  )`,
];

const dayMs = 24 * 60 * 60 * 1000;

type PlaceRow = {
  id: string;
  part: DirectoryPart;
  name: string;
  country: string;
  city: string;
  offers: string;
  contact: string;
  cost: Place['cost'];
  international: number;
  unaware: number;
  verified: number;
  author: string;
  added_at: number;
  vouches: number;
  vouched: number;
};

/** Columns added after launch: [table, column, definition, fill for existing rows]. */
const additions: Array<[string, string, string, string]> = [
  ['members', 'arcana', 'INTEGER', `UPDATE members SET arcana = ${foolArcana} WHERE sequence = 0`],
  ['cards', 'arcana', 'INTEGER', 'UPDATE cards SET arcana = 1 + abs(random()) % 21'],
  [
    'members',
    'role',
    'TEXT',
    "UPDATE members SET role = CASE WHEN sequence = 0 THEN 'fool' ELSE 'member' END",
  ],
];

/** A random number in [0, 1) from the system's secure source. */
function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
}

export type Member = { sequence: number; arcana: number | null; role: Role };

type CardRow = {
  id: string;
  nonce: string;
  inviter: string;
  type: 'member' | 'council';
  expires_at: number;
  claimer: string | null;
  arcana: number;
};

function summary(row: CardRow): CardSummary {
  return {
    id: row.id,
    nonce: row.nonce,
    type: row.type,
    state: row.claimer ? 'claimed' : 'open',
    expiresAt: row.expires_at,
    claimer: row.claimer,
    arcana: row.arcana,
  };
}

export class Registry {
  /** Mutual aid posts and replies. */
  readonly aid: AidBoard;
  /** Openings shared by members. */
  readonly jobs: JobBoard;

  constructor(
    private readonly sql: Sql,
    /** The Fool's did:key. They become a member the first time they are looked up. */
    private readonly founder?: string,
    private readonly random: () => number = secureRandom,
    /** Keys the pseudonyms that stand in for members in stored rows. */
    private readonly secret = 'tero-local',
  ) {
    for (const statement of [...schema, ...aidSchema, ...jobSchema]) sql.exec(statement);
    const member = (did: string) => this.member(did, Date.now());
    this.aid = new AidBoard(sql, member, secret);
    this.jobs = new JobBoard(sql, member, secret);
    for (const [table, column, type, fill] of additions) {
      const columns = this.rows<{ name: string }>(`PRAGMA table_info(${table})`);
      if (columns.some((c) => c.name === column)) continue;
      sql.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      sql.exec(fill);
    }
  }

  private rows<T>(query: string, ...bindings: SqlValue[]): T[] {
    return this.sql.exec(query, ...bindings).toArray() as T[];
  }

  private prune(now: number) {
    this.sql.exec('DELETE FROM cards WHERE expires_at <= ?', now);
  }

  member(did: string, now: number): Member | null {
    const [row] = this.rows<Member>(
      'SELECT sequence, arcana, role FROM members WHERE did = ?',
      did,
    );
    if (row) return { sequence: row.sequence, arcana: row.arcana, role: row.role };
    if (this.founder && did === this.founder) {
      this.addFool(did, now);
      return { sequence: 0, arcana: foolArcana, role: 'fool' };
    }
    return null;
  }

  /** Counts for the council's status panel. Nothing about who. */
  stats(now: number): { members: number; council: number; openCards: number } {
    this.prune(now);
    const count = (query: string) => this.rows<{ n: number }>(query)[0]?.n ?? 0;
    return {
      members: count('SELECT COUNT(*) AS n FROM members'),
      council: count("SELECT COUNT(*) AS n FROM members WHERE role IN ('fool', 'council')"),
      openCards: count('SELECT COUNT(*) AS n FROM cards'),
    };
  }

  /** True only until the first member exists: the Fool's seat is still open. */
  founderSeatOpen(): boolean {
    const [{ count } = { count: 0 }] = this.rows<{ count: number }>(
      'SELECT COUNT(*) AS count FROM members',
    );
    return count === 0;
  }

  /**
   * The first person to claim the seat becomes the Fool (Sequence 0). It can happen
   * only once: as soon as anyone is a member, the seat is closed for good. If
   * FOUNDER_DID is set, only that address may take it.
   */
  claimFounder(did: string, now: number): Result<{ sequence: number }, 'founder_taken'> {
    if (!this.founderSeatOpen()) return { ok: false, error: 'founder_taken' };
    if (this.founder && did !== this.founder) return { ok: false, error: 'founder_taken' };
    this.addFool(did, now);
    return { ok: true, sequence: 0 };
  }

  private addFool(did: string, now: number) {
    this.sql.exec(
      "INSERT INTO members (did, sequence, arcana, role, joined_at) VALUES (?, 0, ?, 'fool', ?)",
      did,
      foolArcana,
      now,
    );
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
  ): Result<{ card: CardSummary }, 'not_member' | 'not_allowed' | 'card_limit' | 'conflict'> {
    const member = this.member(inviter, now);
    if (!member) return { ok: false, error: 'not_member' };
    // Only the Fool seats council members alone; seats by council vote come later.
    if (card.type === 'council' && member.role !== 'fool')
      return { ok: false, error: 'not_allowed' };
    this.prune(now);
    const [{ count } = { count: 0 }] = this.rows<{ count: number }>(
      'SELECT COUNT(*) AS count FROM cards WHERE inviter = ?',
      inviter,
    );
    if (count >= openCardLimit(member.sequence)) return { ok: false, error: 'card_limit' };
    const [row] = this.rows<CardRow>(
      `INSERT INTO cards (id, nonce, inviter, type, expires_at, arcana) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT DO NOTHING RETURNING *`,
      card.id,
      card.nonce,
      inviter,
      card.type,
      now + cardTtlMs,
      drawArcana(member.arcana, this.random, card.type === 'council' ? this.councilSeats() : []),
    );
    return row ? { ok: true, card: summary(row) } : { ok: false, error: 'conflict' };
  }

  /** Cards held by the council or waiting on a council card: each seat has one holder. */
  private councilSeats(): number[] {
    return this.rows<{ arcana: number }>(
      `SELECT arcana FROM members WHERE role IN ('fool', 'council') AND arcana IS NOT NULL
       UNION SELECT arcana FROM cards WHERE type = 'council'`,
    ).map((r) => r.arcana);
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
  ): Result<{ sequence: number; arcana: number }, 'not_found' | 'conflict'> {
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
    const council = card.type === 'council';
    const sequence = council ? councilSequence : newMemberSequence;
    this.sql.exec(
      `INSERT INTO members (did, sequence, arcana, role, joined_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT DO NOTHING`,
      claimer,
      sequence,
      card.arcana,
      council ? 'council' : 'member',
      now,
    );
    return { ok: true, sequence, arcana: card.arcana };
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
  /** Members only; also says whether they may remove other people's places. */
  private canModerate(member: Member): boolean {
    return member.role === 'fool' || member.role === 'council';
  }

  private author(did: string) {
    return pseudonym(this.secret, 'place-author', did);
  }

  private voucher(did: string) {
    return pseudonym(this.secret, 'place-voucher', did);
  }

  listPlaces(
    did: string,
    part: DirectoryPart,
    now: number,
  ): Result<{ places: Place[] }, 'not_member'> {
    if (!this.member(did, now)) return { ok: false, error: 'not_member' };
    const rows = this.rows<PlaceRow>(
      `SELECT p.*,
         (SELECT COUNT(*) FROM place_vouches v WHERE v.place = p.id) AS vouches,
         EXISTS (SELECT 1 FROM place_vouches v WHERE v.place = p.id AND v.voucher = ?) AS vouched
       FROM places p WHERE p.part = ? ORDER BY p.verified DESC, vouches DESC, p.added_at DESC
       LIMIT 500`,
      this.voucher(did),
      part,
    );
    const author = this.author(did);
    return {
      ok: true,
      places: rows.map((row) => ({
        id: row.id,
        part: row.part,
        name: row.name,
        country: row.country,
        city: row.city,
        offers: row.offers,
        contact: row.contact,
        cost: row.cost,
        international: row.international === 1,
        unaware: row.unaware === 1,
        verified: row.verified === 1,
        vouches: row.vouches,
        vouched: row.vouched === 1,
        addedOn: Math.floor(row.added_at / dayMs) * dayMs,
        mine: row.author === author,
      })),
    };
  }

  addPlace(
    did: string,
    place: NewPlace,
    now: number,
  ): Result<{ id: string }, 'not_member' | 'rate_limited'> {
    if (!this.member(did, now)) return { ok: false, error: 'not_member' };
    const author = this.author(did);
    const [{ n } = { n: 0 }] = this.rows<{ n: number }>(
      'SELECT COUNT(*) AS n FROM places WHERE author = ? AND added_at > ?',
      author,
      now - dayMs,
    );
    if (n >= placesPerDay) return { ok: false, error: 'rate_limited' };
    const id = bytesToBase64Url(randomBytes(12));
    this.sql.exec(
      `INSERT INTO places (id, part, name, country, city, offers, contact, cost, international,
         unaware, author, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      place.part,
      place.name.trim(),
      place.country,
      place.city.trim(),
      place.offers.trim(),
      place.contact.trim(),
      place.cost,
      place.international ? 1 : 0,
      place.unaware ? 1 : 0,
      author,
      now,
    );
    return { ok: true, id };
  }

  /** "I've been, it went well", or taking it back. */
  vouchPlace(
    did: string,
    id: string,
    vouch: boolean,
    now: number,
  ): Result<object, 'not_member' | 'not_found' | 'not_allowed'> {
    if (!this.member(did, now)) return { ok: false, error: 'not_member' };
    const [place] = this.rows<{ author: string }>('SELECT author FROM places WHERE id = ?', id);
    if (!place) return { ok: false, error: 'not_found' };
    // Nobody vouches for a place they added themselves.
    if (place.author === this.author(did)) return { ok: false, error: 'not_allowed' };
    if (vouch) {
      this.sql.exec(
        'INSERT INTO place_vouches (place, voucher) VALUES (?, ?) ON CONFLICT DO NOTHING',
        id,
        this.voucher(did),
      );
    } else {
      this.sql.exec(
        'DELETE FROM place_vouches WHERE place = ? AND voucher = ?',
        id,
        this.voucher(did),
      );
    }
    return { ok: true };
  }

  /** The person who added it, the Fool or the council can take a place down. */
  removePlace(
    did: string,
    id: string,
    now: number,
  ): Result<object, 'not_member' | 'not_found' | 'not_allowed'> {
    const member = this.member(did, now);
    if (!member) return { ok: false, error: 'not_member' };
    const [place] = this.rows<{ author: string }>('SELECT author FROM places WHERE id = ?', id);
    if (!place) return { ok: false, error: 'not_found' };
    if (place.author !== this.author(did) && !this.canModerate(member))
      return { ok: false, error: 'not_allowed' };
    this.sql.exec('DELETE FROM place_vouches WHERE place = ?', id);
    this.sql.exec('DELETE FROM places WHERE id = ?', id);
    return { ok: true };
  }
}
