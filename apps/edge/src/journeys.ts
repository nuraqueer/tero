import { pseudonym } from '@tero/crypto';
import type { JourneyBoxResponse } from '@tero/protocol';
import type { Member, Result, Sql, SqlValue } from './registry';

/*
 * Each member's journeys, as one box sealed on their phone. The server only stores it,
 * under a keyed pseudonym, and checks versions so two devices don't silently overwrite
 * each other.
 */

export const journeySchema = [
  `CREATE TABLE IF NOT EXISTS journey_boxes (
    owner TEXT PRIMARY KEY,
    box TEXT NOT NULL,
    version INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
];

export class JourneyStore {
  constructor(
    private readonly sql: Sql,
    private readonly member: (did: string) => Member | null,
    private readonly secret: string,
  ) {}

  private rows<T>(query: string, ...bindings: SqlValue[]): T[] {
    return this.sql.exec(query, ...bindings).toArray() as T[];
  }

  private owner(did: string) {
    return pseudonym(this.secret, 'journey-owner', did);
  }

  get(did: string): Result<JourneyBoxResponse, 'not_member'> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    const [row] = this.rows<{ box: string; version: number }>(
      'SELECT box, version FROM journey_boxes WHERE owner = ?',
      this.owner(did),
    );
    return { ok: true, box: row?.box ?? null, version: row?.version ?? 0 };
  }

  /** Saves only if version is the one stored now; the stored version then goes up by one. */
  save(
    did: string,
    box: string,
    version: number,
    now: number,
  ): Result<{ version: number }, 'not_member' | 'conflict'> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    const owner = this.owner(did);
    const next = version + 1;
    const changed =
      version === 0
        ? this.rows(
            `INSERT INTO journey_boxes (owner, box, version, updated_at) VALUES (?, ?, 1, ?)
             ON CONFLICT DO NOTHING RETURNING owner`,
            owner,
            box,
            now,
          )
        : this.rows(
            `UPDATE journey_boxes SET box = ?, version = ?, updated_at = ?
             WHERE owner = ? AND version = ? RETURNING owner`,
            box,
            next,
            now,
            owner,
            version,
          );
    return changed.length ? { ok: true, version: next } : { ok: false, error: 'conflict' };
  }
}
