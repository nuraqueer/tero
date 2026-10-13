import {
  verifyDirectoryGrant,
  verifyProfileEnvelope,
  type DirectoryGrant,
  type ProfileEnvelope,
} from '@tero/crypto';
import type {
  ConnectionAction,
  ConnectionSummary,
  DiscoveryMember,
  DiscoveryPage,
} from '@tero/protocol';
import type { Member, Result, Sql, SqlValue } from './registry';

export const discoverySchema = [
  `CREATE TABLE IF NOT EXISTS discovery_directory (singleton INTEGER PRIMARY KEY CHECK(singleton = 1), id TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS discovery_grants (recipient TEXT NOT NULL, sender TEXT NOT NULL, envelope TEXT NOT NULL, PRIMARY KEY(recipient, sender))`,
  `CREATE TABLE IF NOT EXISTS discovery_profiles (owner TEXT PRIMARY KEY, handle_tag TEXT NOT NULL UNIQUE, revision INTEGER NOT NULL, envelope TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS discovery_connections (a TEXT NOT NULL, b TEXT NOT NULL, requester TEXT NOT NULL, accepted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(a,b))`,
];
type Failure = 'not_member' | 'not_allowed' | 'conflict' | 'not_found' | 'bad_request' | 'capacity';

/** Transitional admission and coordination; personal profile text remains encrypted. */
export class DiscoveryRegistry {
  constructor(
    private readonly sql: Sql,
    private readonly member: (did: string) => Member | null,
    private readonly atomic: <T>(operation: () => T) => T,
  ) {}
  private rows<T>(query: string, ...bindings: SqlValue[]): T[] {
    return this.sql.exec(query, ...bindings).toArray() as T[];
  }
  private directory(): string | null {
    return (
      this.rows<{ id: string }>('SELECT id FROM discovery_directory WHERE singleton = 1')[0]?.id ??
      null
    );
  }
  page(did: string, cursor: string): Result<DiscoveryPage, Failure> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    const rows = this.rows<{
      did: string;
      sequence: number;
      arcana: number | null;
      envelope: string | null;
      needs_grant: number;
    }>(
      `SELECT m.did, m.sequence, m.arcana, p.envelope,
       NOT EXISTS (SELECT 1 FROM discovery_grants g WHERE g.recipient = m.did AND g.sender = m.did) AS needs_grant
       FROM members m LEFT JOIN discovery_profiles p ON p.owner = m.did
       WHERE m.did > ? ORDER BY m.did LIMIT 101`,
      cursor,
    );
    const own = this.rows<{ envelope: string }>(
      'SELECT envelope FROM discovery_grants WHERE recipient = ? ORDER BY sender LIMIT 100',
      did,
    );
    const members: DiscoveryMember[] = rows.slice(0, 100).map((row) => ({
      did: row.did,
      sequence: row.sequence,
      arcana: row.arcana,
      needsGrant: !!row.needs_grant,
      profile: row.envelope ? (JSON.parse(row.envelope) as ProfileEnvelope) : null,
    }));
    const self = this.rows<{ envelope: string }>(
      'SELECT envelope FROM discovery_profiles WHERE owner = ?',
      did,
    )[0];
    return {
      ok: true,
      selfProfile: self ? (JSON.parse(self.envelope) as ProfileEnvelope) : null,
      directory: this.directory(),
      grants: own.map((row) => JSON.parse(row.envelope) as DirectoryGrant),
      members,
      cursor: rows.length > 100 ? members.at(-1)!.did : null,
    };
  }
  grant(did: string, grant: DirectoryGrant): Result<object, Failure> {
    return this.atomic(() => this.saveGrant(did, grant));
  }

  private saveGrant(did: string, grant: DirectoryGrant): Result<object, Failure> {
    const member = this.member(did);
    if (!member || !this.member(grant.recipient)) return { ok: false, error: 'not_member' };
    if (grant.sender !== did || !verifyDirectoryGrant(grant))
      return { ok: false, error: 'bad_request' };
    const directory = this.directory();
    if (!directory) {
      if (member.role !== 'fool' || grant.recipient !== did)
        return { ok: false, error: 'not_allowed' };
      this.sql.exec(
        'INSERT INTO discovery_directory (singleton, id) VALUES (1, ?)',
        grant.directory,
      );
    } else {
      if (directory !== grant.directory) return { ok: false, error: 'conflict' };
      if (!this.rows('SELECT recipient FROM discovery_grants WHERE recipient = ?', did).length)
        return { ok: false, error: 'not_allowed' };
    }
    this.sql.exec(
      'INSERT INTO discovery_grants (recipient, sender, envelope) VALUES (?, ?, ?) ON CONFLICT(recipient, sender) DO UPDATE SET envelope = excluded.envelope',
      grant.recipient,
      did,
      JSON.stringify(grant),
    );
    return { ok: true };
  }
  handleAvailable(
    did: string,
    directory: string,
    handleTag: string,
  ): Result<{ available: boolean }, Failure> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    if (!/^[A-Za-z0-9_-]{43}$/.test(handleTag)) return { ok: false, error: 'bad_request' };
    if (
      directory !== this.directory() ||
      !this.rows('SELECT recipient FROM discovery_grants WHERE recipient = ?', did).length
    )
      return { ok: false, error: 'not_allowed' };
    return {
      ok: true,
      available: !this.rows(
        'SELECT owner FROM discovery_profiles WHERE handle_tag = ? AND owner != ?',
        handleTag,
        did,
      ).length,
    };
  }
  saveProfile(did: string, profile: ProfileEnvelope): Result<object, Failure> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    if (!verifyProfileEnvelope(profile) || profile.owner !== did)
      return { ok: false, error: 'bad_request' };
    if (
      profile.directory !== this.directory() ||
      !this.rows('SELECT recipient FROM discovery_grants WHERE recipient = ?', did).length
    )
      return { ok: false, error: 'not_allowed' };
    const previous = this.rows<{ handle_tag: string; revision: number }>(
      'SELECT handle_tag, revision FROM discovery_profiles WHERE owner = ?',
      did,
    )[0];
    if (
      (previous?.revision ?? 0) + 1 !== profile.revision ||
      (previous && previous.handle_tag !== profile.handleTag)
    )
      return { ok: false, error: 'conflict' };
    if (
      this.rows(
        'SELECT owner FROM discovery_profiles WHERE handle_tag = ? AND owner != ?',
        profile.handleTag,
        did,
      ).length
    )
      return { ok: false, error: 'conflict' };
    this.sql.exec(
      `INSERT INTO discovery_profiles (owner, handle_tag, revision, envelope) VALUES (?, ?, ?, ?)
      ON CONFLICT(owner) DO UPDATE SET revision = excluded.revision, envelope = excluded.envelope`,
      did,
      profile.handleTag,
      profile.revision,
      JSON.stringify(profile),
    );
    return { ok: true };
  }
  connections(did: string): Result<{ connections: ConnectionSummary[] }, Failure> {
    if (!this.member(did)) return { ok: false, error: 'not_member' };
    const rows = this.rows<{ a: string; b: string; requester: string; accepted: number }>(
      'SELECT a, b, requester, accepted FROM discovery_connections WHERE a = ? OR b = ?',
      did,
      did,
    );
    return {
      ok: true,
      connections: rows.map((r) => ({
        peer: r.a === did ? r.b : r.a,
        state: r.accepted ? 'accepted' : r.requester === did ? 'outgoing' : 'incoming',
      })),
    };
  }
  connect(did: string, peer: string, action: ConnectionAction): Result<object, Failure> {
    if (!this.member(did) || !this.member(peer)) return { ok: false, error: 'not_member' };
    if (did === peer) return { ok: false, error: 'bad_request' };
    const [a, b] = [did, peer].sort();
    const row = this.rows<{ requester: string; accepted: number }>(
      'SELECT requester, accepted FROM discovery_connections WHERE a = ? AND b = ?',
      a!,
      b!,
    )[0];
    if (action === 'remove')
      this.sql.exec('DELETE FROM discovery_connections WHERE a = ? AND b = ?', a!, b!);
    else if (action === 'accept') {
      if (!row) return { ok: false, error: 'not_found' };
      if (row.requester === did) return { ok: false, error: 'not_allowed' };
      this.sql.exec('UPDATE discovery_connections SET accepted = 1 WHERE a = ? AND b = ?', a!, b!);
    } else if (!row) {
      const count = (owner: string) =>
        this.rows<{ n: number }>(
          'SELECT COUNT(*) AS n FROM discovery_connections WHERE a = ? OR b = ?',
          owner,
          owner,
        )[0]!.n;
      if (count(did) >= 500 || count(peer) >= 500) return { ok: false, error: 'capacity' };
      this.sql.exec(
        'INSERT INTO discovery_connections (a, b, requester) VALUES (?, ?, ?)',
        a!,
        b!,
        did,
      );
    }
    return { ok: true };
  }
}
