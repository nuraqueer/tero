import { isSealedObject, pseudonym, type SealedObject } from '@tero/crypto';
import type { Result, Sql, SqlValue } from './registry';

export type FallbackReceipt = { id: string; storedAt: number; expiresAt: number };
export type FallbackError = 'bad_request' | 'rate_limited' | 'capacity';

/** Engineering limits for the disabled experiment, not product retention policy. */
export const fallbackLimits = {
  bucketBytes: 512 * 1024,
  bucketObjects: 128,
  quotaRows: 1024,
  newObjectsPerMemberPerBucketPerDay: 10,
  maxRetentionMs: 24 * 60 * 60 * 1000,
} as const;

const dayMs = 24 * 60 * 60 * 1000;
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Call only after validating an object ID. A fixed bucket count bounds namespace growth. */
export function fallbackBucket(id: string): string {
  return `sefirah-v1-${alphabet.indexOf(id[0]!) % 16}`;
}

export class FallbackStore {
  constructor(
    private readonly sql: Sql,
    private readonly quotaSecret: string,
  ) {
    sql.exec(`CREATE TABLE IF NOT EXISTS fallback_objects (
      id TEXT PRIMARY KEY,
      box TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      stored_at INTEGER NOT NULL
    )`);
    sql.exec(`CREATE TABLE IF NOT EXISTS fallback_quotas (
      owner TEXT PRIMARY KEY,
      day INTEGER NOT NULL,
      count INTEGER NOT NULL CHECK(count > 0)
    )`);
  }

  private rows<T>(query: string, ...bindings: SqlValue[]): T[] {
    return this.sql.exec(query, ...bindings).toArray() as T[];
  }

  get(id: string, now: number): SealedObject | null {
    const [row] = this.rows<{ box: string; expires_at: number }>(
      'SELECT box, expires_at FROM fallback_objects WHERE id = ? AND expires_at > ?',
      id,
      now,
    );
    return row ? { version: 1, id, box: row.box, expiresAt: row.expires_at } : null;
  }

  /** Synchronous within a DO call: never await between checking capacity and inserting. */
  put(did: string, object: unknown, now: number): Result<FallbackReceipt, FallbackError> {
    if (
      !isSealedObject(object) ||
      object.expiresAt <= now ||
      object.expiresAt > now + fallbackLimits.maxRetentionMs
    ) {
      return { ok: false, error: 'bad_request' };
    }
    const [existing] = this.rows<{ stored_at: number; expires_at: number }>(
      'SELECT stored_at, expires_at FROM fallback_objects WHERE id = ?',
      object.id,
    );
    if (existing) {
      return {
        ok: true,
        id: object.id,
        storedAt: existing.stored_at,
        expiresAt: existing.expires_at,
      };
    }

    const day = Math.floor(now / dayMs);
    this.sql.exec('DELETE FROM fallback_objects WHERE expires_at <= ?', now);
    this.sql.exec('DELETE FROM fallback_quotas WHERE day < ?', day);
    const [usage] = this.rows<{ bytes: number; count: number }>(
      'SELECT COALESCE(SUM(length(box)), 0) AS bytes, COUNT(*) AS count FROM fallback_objects',
    );
    if (
      !usage ||
      usage.bytes + object.box.length > fallbackLimits.bucketBytes ||
      usage.count >= fallbackLimits.bucketObjects
    ) {
      return { ok: false, error: 'capacity' };
    }
    // The day is in the pseudonym too, avoiding stable links between quota days.
    const owner = pseudonym(this.quotaSecret, `sefirah-quota/${day}`, did);
    const [quota] = this.rows<{ count: number }>(
      'SELECT count FROM fallback_quotas WHERE owner = ?',
      owner,
    );
    if ((quota?.count ?? 0) >= fallbackLimits.newObjectsPerMemberPerBucketPerDay) {
      return { ok: false, error: 'rate_limited' };
    }
    if (!quota) {
      const [rows] = this.rows<{ count: number }>('SELECT COUNT(*) AS count FROM fallback_quotas');
      if (!rows || rows.count >= fallbackLimits.quotaRows) return { ok: false, error: 'capacity' };
    }
    this.sql.exec(
      `INSERT INTO fallback_objects (id, box, expires_at, stored_at) VALUES (?, ?, ?, ?)`,
      object.id,
      object.box,
      object.expiresAt,
      now,
    );
    // In the Workers runtime these synchronous writes are committed together before
    // the RPC response is released by the storage output gate.
    this.sql.exec(
      `INSERT INTO fallback_quotas (owner, day, count) VALUES (?, ?, 1)
       ON CONFLICT(owner) DO UPDATE SET count = count + 1`,
      owner,
      day,
    );
    return { ok: true, id: object.id, storedAt: now, expiresAt: object.expiresAt };
  }
}
