import { DurableObject } from 'cloudflare:workers';
import { pseudonym, base64UrlToBytes, sealText, openText, publicKeyFromDid } from '@tero/crypto';
import type { Env, RegistryApi } from './index';

const validToken = (v: unknown): v is string =>
  typeof v === 'string' && /^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]{10,200}\]$/.test(v);
const tag = (env: Env, did: string) => pseudonym(env.AUTH_SECRET!, 'chat-push-recipient/v1', did);
const service = (env: Env) => env.CHAT_PUSH!.get(env.CHAT_PUSH!.idFromName('chat-push/v1'));
const routeContext = 'chat-push-route/v1';
const routeKey = (env: Env, did: string) =>
  base64UrlToBytes(pseudonym(env.AUTH_SECRET!, routeContext, did))!;
// Only fixed provider codes may enter logs; never log tokens or provider bodies.
function providerCode(value: unknown) {
  return typeof value === 'string' &&
    [
      'DeviceNotRegistered',
      'MessageTooBig',
      'MessageRateExceeded',
      'MismatchSenderId',
      'InvalidCredentials',
      'UNAUTHORIZED',
      'PUSH_TOO_MANY_EXPERIENCE_IDS',
    ].includes(value)
    ? value
    : 'unknown';
}

/** Optional sender names are owner approved. Route DIDs stay sealed; message text stays private. */
export class ChatPush extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS devices (token TEXT PRIMARY KEY, owner TEXT NOT NULL, updated INTEGER NOT NULL)',
    );
    ctx.storage.sql.exec('CREATE INDEX IF NOT EXISTS device_owner ON devices(owner)');
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS wakes (id TEXT PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0)',
    );
    const columns = new Set(
      ctx.storage.sql
        .exec<{ name: string }>('PRAGMA table_info(wakes)')
        .toArray()
        .map((v) => v.name),
    );
    if (!columns.has('route')) ctx.storage.sql.exec('ALTER TABLE wakes ADD COLUMN route TEXT');
    if (!columns.has('sender_name'))
      ctx.storage.sql.exec('ALTER TABLE wakes ADD COLUMN sender_name TEXT');
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, owner TEXT NOT NULL, token TEXT NOT NULL, expires INTEGER NOT NULL, next INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)',
    );
  }
  register(owner: string, token: string) {
    if (!validToken(token)) return false;
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(
        'INSERT INTO devices VALUES (?, ?, ?) ON CONFLICT(token) DO UPDATE SET owner=excluded.owner, updated=excluded.updated',
        token,
        owner,
        Date.now(),
      );
      this.ctx.storage.sql.exec(
        'DELETE FROM devices WHERE owner = ? AND token NOT IN (SELECT token FROM devices WHERE owner = ? ORDER BY updated DESC LIMIT 4)',
        owner,
        owner,
      );
    });
    return true;
  }
  remove(owner: string, token: string) {
    this.ctx.storage.sql.exec('DELETE FROM devices WHERE owner = ? AND token = ?', owner, token);
  }
  async enqueue(owner: string, id: string, expires: number, route: string, senderName?: string) {
    const now = Date.now();
    this.ctx.storage.sql.exec('DELETE FROM wakes WHERE expires <= ?', now);
    this.ctx.storage.sql.exec('DELETE FROM devices WHERE updated < ?', now - 90 * 86_400_000);
    const count = this.ctx.storage.sql
      .exec<{ n: number }>('SELECT COUNT(*) AS n FROM wakes')
      .one().n;
    if (count >= 4096) return;
    this.ctx.storage.sql.exec(
      'INSERT OR IGNORE INTO wakes (id,owner,expires,next,route,sender_name) VALUES (?,?,?,?,?,?)',
      id,
      owner,
      Math.min(expires, now + 86_400_000),
      now,
      route,
      senderName ?? null,
    );
    await this.schedule();
  }
  private async schedule() {
    const next = this.ctx.storage.sql
      .exec<{ at: number | null }>(
        'SELECT MIN(next) AS at FROM (SELECT next FROM wakes WHERE done=0 UNION ALL SELECT next FROM receipts)',
      )
      .one().at;
    if (next === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.max(Date.now() + 100, next));
  }
  async alarm() {
    const now = Date.now();
    this.ctx.storage.sql.exec('DELETE FROM wakes WHERE expires <= ?', now);
    this.ctx.storage.sql.exec('DELETE FROM receipts WHERE expires <= ?', now);
    const jobs = this.ctx.storage.sql
      .exec<{
        id: string;
        owner: string;
        attempts: number;
        expires: number;
        route: string | null;
        sender_name: string | null;
      }>(
        'SELECT id,owner,attempts,expires,route,sender_name FROM wakes WHERE done=0 AND next <= ? ORDER BY next LIMIT 10',
        now,
      )
      .toArray();
    for (const job of jobs) {
      const devices = this.ctx.storage.sql
        .exec<{ token: string }>('SELECT token FROM devices WHERE owner = ? LIMIT 4', job.owner)
        .toArray();
      let retry = false;
      if (devices.length) {
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              ...(this.env.EXPO_PUSH_ACCESS_TOKEN
                ? { authorization: `Bearer ${this.env.EXPO_PUSH_ACCESS_TOKEN}` }
                : {}),
            },
            body: JSON.stringify(
              devices.map(({ token }) => ({
                to: token,
                title: job.sender_name || 'Tero',
                body: 'New message',
                sound: 'default',
                priority: 'high',
                channelId: 'messages',
                ttl: Math.max(1, Math.floor((job.expires - Date.now()) / 1000)),
                data: { kind: 'chat', ...(job.route ? { route: job.route } : {}) },
              })),
            ),
            signal: AbortSignal.timeout(10_000),
          });
          if (!response.ok) {
            console.warn('[chat-push] provider HTTP', response.status);
            retry = response.status === 429 || response.status >= 500;
          } else {
            const result = (await response.json()) as {
              data?: { status: string; id?: string; details?: { error?: string } }[];
            };
            if (!Array.isArray(result.data) || result.data.length !== devices.length) retry = true;
            else
              result.data.forEach((ticket, i) => {
                if (ticket.status !== 'ok')
                  console.warn('[chat-push] ticket rejected', providerCode(ticket.details?.error));
                if (ticket.details?.error === 'DeviceNotRegistered')
                  this.remove(job.owner, devices[i]!.token);
                else if (ticket.status === 'ok' && ticket.id) {
                  this.ctx.storage.sql.exec(
                    'INSERT OR IGNORE INTO receipts (id,owner,token,expires,next) VALUES (?,?,?,?,?)',
                    ticket.id,
                    job.owner,
                    devices[i]!.token,
                    now + 86_400_000,
                    now + 15 * 60_000,
                  );
                } else if (ticket.details?.error === 'MessageRateExceeded') retry = true;
              });
          }
        } catch {
          retry = true;
        }
      }
      this.ctx.storage.sql.exec(
        'UPDATE wakes SET attempts=attempts+1, next=?, done=? WHERE id=?',
        now + Math.min(15 * 60_000, 30_000 * 2 ** job.attempts),
        !retry || job.attempts >= 4 ? 1 : 0,
        job.id,
      );
    }
    const receipts = this.ctx.storage.sql
      .exec<{ id: string; owner: string; token: string; attempts: number }>(
        'SELECT id,owner,token,attempts FROM receipts WHERE next <= ? LIMIT 100',
        now,
      )
      .toArray();
    if (receipts.length) {
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(this.env.EXPO_PUSH_ACCESS_TOKEN
              ? { authorization: `Bearer ${this.env.EXPO_PUSH_ACCESS_TOKEN}` }
              : {}),
          },
          body: JSON.stringify({ ids: receipts.map((v) => v.id) }),
          signal: AbortSignal.timeout(10_000),
        });
        const result = response.ok
          ? ((await response.json()) as {
              data?: Record<string, { status: string; details?: { error?: string } }>;
            })
          : null;
        for (const receipt of receipts) {
          const value = result?.data?.[receipt.id];
          if (value && value.status !== 'ok')
            console.warn('[chat-push] receipt rejected', providerCode(value.details?.error));
          if (value?.details?.error === 'DeviceNotRegistered')
            this.remove(receipt.owner, receipt.token);
          if (value || receipt.attempts >= 5)
            this.ctx.storage.sql.exec('DELETE FROM receipts WHERE id=?', receipt.id);
          else
            this.ctx.storage.sql.exec(
              'UPDATE receipts SET next=?, attempts=attempts+1 WHERE id=?',
              now + 15 * 60_000,
              receipt.id,
            );
        }
      } catch {
        for (const receipt of receipts)
          this.ctx.storage.sql.exec(
            'UPDATE receipts SET next=?, attempts=attempts+1 WHERE id=?',
            now + 15 * 60_000,
            receipt.id,
          );
      }
    }
    await this.schedule();
  }
}

export async function handlePush(request: Request, did: string, env: Env, reg: RegistryApi) {
  const reply = (error: string, status: number) => Response.json({ error }, { status });
  if (!env.CHAT_PUSH) return reply('unavailable', 503);
  if (!(await reg.member(did))) return reply('not_member', 403);
  const resolve = new URL(request.url).pathname === '/api/push/open';
  if (resolve ? request.method !== 'POST' : request.method !== 'PUT' && request.method !== 'DELETE')
    return reply('method_not_allowed', 405);
  // Tokens are small; never accept an unbounded registration body.
  const reader = request.body?.getReader();
  if (!reader) return reply('bad_request', 400);
  const bytes = new Uint8Array(resolve ? 2048 : 1024);
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (length + chunk.value.length > bytes.length) {
        await reader.cancel();
        return reply('bad_request', 400);
      }
      bytes.set(chunk.value, length);
      length += chunk.value.length;
    }
    const body = JSON.parse(new TextDecoder().decode(bytes.subarray(0, length))) as {
      token?: unknown;
      route?: unknown;
    };
    if (resolve) {
      if (typeof body.route !== 'string' || body.route.length > 1600)
        return reply('bad_request', 400);
      const key = routeKey(env, did);
      let plain: string | null;
      try {
        plain = openText(key, routeContext, body.route);
      } finally {
        key.fill(0);
      }
      if (!plain) return reply('not_allowed', 403);
      const target = JSON.parse(plain) as { peer?: unknown; expiresAt?: unknown };
      if (
        typeof target.peer !== 'string' ||
        !publicKeyFromDid(target.peer) ||
        !Number.isSafeInteger(target.expiresAt) ||
        (target.expiresAt as number) <= Date.now()
      )
        return reply('not_allowed', 403);
      const connections = await reg.connections(did);
      if (
        !connections.ok ||
        !connections.connections.some((v) => v.peer === target.peer && v.state === 'accepted')
      )
        return reply('not_allowed', 403);
      return Response.json({ peer: target.peer }, { headers: { 'cache-control': 'no-store' } });
    }
    if (!validToken(body.token)) return reply('bad_request', 400);
    if (request.method === 'PUT') await service(env).register(tag(env, did), body.token);
    else await service(env).remove(tag(env, did), body.token);
    return new Response(null, { status: 204 });
  } catch {
    return reply('bad_request', 400);
  } finally {
    reader.releaseLock();
  }
}
export async function enqueueChatPush(
  env: Env,
  recipient: string,
  sender: string,
  id: string,
  expires: number,
  senderName?: string,
) {
  if (!env.CHAT_PUSH) return;
  const key = routeKey(env, recipient);
  let route: string;
  try {
    route = sealText(key, routeContext, JSON.stringify({ peer: sender, expiresAt: expires }));
  } finally {
    key.fill(0);
  }
  await service(env).enqueue(tag(env, recipient), id, expires, route, senderName);
}
