import { DurableObject } from 'cloudflare:workers';
import {
  isSealedObject,
  verifyDeliveryDescriptor,
  type DeliveryDescriptor,
  type SealedObject,
  type ChatPresence,
} from '@tero/crypto';
import type { Env } from './index';

type Row = {
  id: string;
  sender: string;
  recipient: string;
  descriptor: string;
  object: string | null;
  expires: number;
  stored: number;
};
/** One bounded mailbox per accepted pair. It never possesses plaintext or content keys. */
export class ChatMailbox extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS packets (
      id TEXT PRIMARY KEY, sender TEXT NOT NULL, recipient TEXT NOT NULL,
      descriptor TEXT NOT NULL, object TEXT, expires INTEGER NOT NULL, stored INTEGER NOT NULL)`);
    ctx.storage.sql.exec('CREATE INDEX IF NOT EXISTS packet_expiry ON packets(expires)');
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS presence (sender TEXT PRIMARY KEY, record TEXT NOT NULL, at INTEGER NOT NULL, expires INTEGER NOT NULL)',
    );
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS quotas (sender TEXT PRIMARY KEY, day INTEGER NOT NULL, count INTEGER NOT NULL)',
    );
  }
  private clean() {
    this.ctx.storage.sql.exec('DELETE FROM presence WHERE expires <= ?', Date.now());
    this.ctx.storage.sql.exec('DELETE FROM packets WHERE expires <= ?', Date.now());
    this.ctx.storage.sql.exec(
      'DELETE FROM quotas WHERE day < ?',
      Math.floor(Date.now() / 86_400_000),
    );
  }
  private async schedule() {
    const row = this.ctx.storage.sql
      .exec<{ expiry: number | null }>(
        'SELECT MIN(expires) AS expiry FROM (SELECT expires FROM packets UNION ALL SELECT expires FROM presence)',
      )
      .one();
    if (row.expiry !== null) await this.ctx.storage.setAlarm(row.expiry);
    else await this.ctx.storage.deleteAlarm();
  }
  async alarm() {
    this.clean();
    await this.schedule();
  }
  async setPresence(record: ChatPresence) {
    // Signed timestamps prevent a delayed heartbeat from overriding a later hide.
    this.ctx.storage.sql.exec(
      'INSERT INTO presence VALUES (?,?,?,?) ON CONFLICT(sender) DO UPDATE SET record=excluded.record, at=excluded.at, expires=excluded.expires WHERE excluded.at > presence.at',
      record.sender,
      JSON.stringify(record),
      record.at,
      record.expiresAt,
    );
    await this.schedule();
  }
  getPresence(sender: string): ChatPresence | null {
    this.clean();
    const row = this.ctx.storage.sql
      .exec<{ record: string }>('SELECT record FROM presence WHERE sender=?', sender)
      .toArray()[0];
    return row ? (JSON.parse(row.record) as ChatPresence) : null;
  }
  async put(
    sender: string,
    recipient: string,
    descriptor: DeliveryDescriptor,
    object: SealedObject | null,
  ) {
    const now = Date.now();
    if (
      !verifyDeliveryDescriptor(descriptor, now) ||
      descriptor.sender !== sender ||
      descriptor.recipient !== recipient ||
      (object !== null &&
        (!isSealedObject(object) ||
          object.id !== descriptor.objectId ||
          object.expiresAt !== descriptor.expiresAt))
    )
      return { ok: false as const, error: 'bad_request' as const };
    const result = this.ctx.storage.transactionSync(() => {
      this.clean();
      const previous = this.ctx.storage.sql
        .exec<Row>('SELECT * FROM packets WHERE id = ?', descriptor.objectId)
        .toArray()[0];
      const encoded = JSON.stringify(descriptor);
      const box = object === null ? null : JSON.stringify(object);
      if (previous) {
        if (
          previous.descriptor !== encoded ||
          (previous.object !== null && box !== null && previous.object !== box)
        )
          return { ok: false as const, error: 'conflict' as const };
        if (previous.object === null && box !== null) {
          const usage = this.ctx.storage.sql
            .exec<{ bytes: number }>(
              'SELECT COALESCE(SUM(COALESCE(length(object),0) + length(descriptor)),0) AS bytes FROM packets',
            )
            .one();
          if (usage.bytes + box.length > 4 * 1024 * 1024)
            return { ok: false as const, error: 'capacity' as const };
          this.ctx.storage.sql.exec(
            'UPDATE packets SET object = ? WHERE id = ?',
            box,
            descriptor.objectId,
          );
        }
        return { ok: true as const, storedAt: previous.stored, expiresAt: previous.expires };
      }
      const usage = this.ctx.storage.sql
        .exec<{ n: number; bytes: number }>(
          'SELECT COUNT(*) AS n, COALESCE(SUM(COALESCE(length(object),0) + length(descriptor)),0) AS bytes FROM packets',
        )
        .one();
      if (usage.n >= 64 || usage.bytes + encoded.length + (box?.length ?? 0) > 4 * 1024 * 1024)
        return { ok: false as const, error: 'capacity' as const };
      const day = Math.floor(now / 86_400_000);
      const quota = this.ctx.storage.sql
        .exec<{ count: number }>(
          'SELECT count FROM quotas WHERE sender = ? AND day = ?',
          sender,
          day,
        )
        .toArray()[0];
      if ((quota?.count ?? 0) >= 512) return { ok: false as const, error: 'capacity' as const };
      this.ctx.storage.sql.exec(
        'INSERT INTO packets VALUES (?, ?, ?, ?, ?, ?, ?)',
        descriptor.objectId,
        sender,
        recipient,
        encoded,
        box,
        descriptor.expiresAt,
        now,
      );
      this.ctx.storage.sql.exec(
        'INSERT INTO quotas VALUES (?, ?, 1) ON CONFLICT(sender) DO UPDATE SET day=excluded.day, count=count+1',
        sender,
        day,
      );
      return { ok: true as const, storedAt: now, expiresAt: descriptor.expiresAt };
    });
    await this.schedule();
    return result;
  }
  list(recipient: string, sender: string) {
    this.clean();
    return this.ctx.storage.sql
      .exec<Row>(
        'SELECT * FROM packets WHERE recipient = ? AND sender = ? ORDER BY stored, id LIMIT 32',
        recipient,
        sender,
      )
      .toArray()
      .map((row) => ({
        descriptor: JSON.parse(row.descriptor) as DeliveryDescriptor,
        fallback: row.object !== null,
      }));
  }
  get(recipient: string, sender: string, id: string): SealedObject | null {
    this.clean();
    const row = this.ctx.storage.sql
      .exec<Row>(
        'SELECT * FROM packets WHERE id = ? AND recipient = ? AND sender = ?',
        id,
        recipient,
        sender,
      )
      .toArray()[0];
    return row?.object ? (JSON.parse(row.object) as SealedObject) : null;
  }
  async acknowledge(recipient: string, sender: string, id: string) {
    this.ctx.storage.sql.exec(
      'DELETE FROM packets WHERE id = ? AND recipient = ? AND sender = ?',
      id,
      recipient,
      sender,
    );
    await this.schedule();
  }
}
