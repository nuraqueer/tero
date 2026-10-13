import { createServer, type RequestListener, type Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomBytes, sealPost } from '@tero/crypto';
import { SefirahOutbox } from './sefirah-outbox';
import { sefirahFallback } from './sefirah-fallback';

const post = sealPost(randomBytes(32), randomBytes(32), 'synthetic HTTP test', Date.now() + 60_000);
const receipt = { id: post.id, expiresAt: post.expiresAt, storedAt: Date.now() };
const servers: Server[] = [];
afterEach(async () => {
  vi.useRealTimers();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
async function serve(handler: RequestListener) {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no test port');
  return `http://127.0.0.1:${address.port}`;
}
const signal = () => new AbortController().signal;

describe('explicit fallback HTTP adapter', () => {
  it('sends immutable bytes with authentication and reads a validated object over real HTTP', async () => {
    let calls = 0;
    const base = await serve((req, res) => {
      calls++;
      expect(req.url).toBe(`/api/sefirah/objects/${post.id}`);
      expect(req.headers.authorization).toBe('Bearer development-token');
      const chunks: Buffer[] = [];
      req.on('data', (b) => chunks.push(b));
      req.on('end', () => {
        if (req.method === 'PUT')
          expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual(post);
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(req.method === 'PUT' ? receipt : post));
      });
    });
    const client = sefirahFallback(base, 'development-token');
    const slots: (string | null)[] = [null, null];
    const storage = {
      read: (i: 0 | 1) => slots[i],
      write: (i: 0 | 1, box: string) => {
        slots[i] = box;
      },
    };
    const key = randomBytes(32);
    const queue = new SefirahOutbox(storage, key);
    queue.enqueue(post);
    await queue.deliver(post.id, client);
    queue.close();
    const restored = new SefirahOutbox(storage, key);
    await restored.deliver(post.id, client);
    expect(await client.get(post.id, signal())).toEqual(post);
    expect(calls).toBe(2);
  });

  it('blocks redirects before another endpoint receives the bearer token', async () => {
    let followed = false;
    const destination = await serve((_, res) => {
      followed = true;
      res.end('{}');
    });
    const base = await serve((_, res) => {
      res.writeHead(307, { location: destination });
      res.end();
    });
    await expect(sefirahFallback(base, 'secret').put(post, signal())).rejects.toMatchObject({
      reason: 'network',
    });
    expect(followed).toBe(false);
  });

  it('retains status for capacity and admission failures without trusting error bodies', async () => {
    for (const status of [401, 403, 429, 503]) {
      const base = await serve((_, res) => {
        res.writeHead(status);
        res.end('untrusted server detail');
      });
      await expect(sefirahFallback(base, 'token').put(post, signal())).rejects.toMatchObject({
        reason: 'http',
        status,
      });
    }
  });

  it('rejects wrong objects, invalid receipts, and malformed responses', async () => {
    const responses = [
      { ...post, id: 'wrong' },
      { ...post, box: post.box.slice(1) },
      { ...post, expiresAt: Date.now() - 1 },
      { ...receipt, id: 'wrong' },
      { ...receipt, expiresAt: receipt.expiresAt + 1 },
      { ...receipt, storedAt: 0 },
      { ...receipt, extra: 'field' },
    ];
    for (let i = 0; i < responses.length; i++) {
      const base = await serve((_, res) => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(responses[i]));
      });
      const client = sefirahFallback(base, 'token');
      await expect(
        i < 3 ? client.get(post.id, signal()) : client.put(post, signal()),
      ).rejects.toMatchObject({ reason: 'invalid_response' });
    }
  });

  it('bounds streamed response bytes without relying on content-length', async () => {
    const base = await serve((_, res) => {
      res.setHeader('content-type', 'application/json');
      res.write(' '.repeat(40 * 1024));
      res.end(' '.repeat(40 * 1024));
    });
    await expect(sefirahFallback(base, 'token').get(post.id, signal())).rejects.toMatchObject({
      reason: 'invalid_response',
    });
  });

  it('cancels an actual stalled HTTP response when the queue closes', async () => {
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    const base = await serve((_, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write('{');
      started();
    });
    const slots: (string | null)[] = [null, null];
    const queue = new SefirahOutbox(
      {
        read: (i) => slots[i],
        write: (i, box) => {
          slots[i] = box;
        },
      },
      randomBytes(32),
    );
    queue.enqueue(post);
    const result = queue.deliver(post.id, sefirahFallback(base, 'token'));
    const assertion = expect(result).rejects.toMatchObject({ reason: 'cancelled' });
    await ready;
    queue.close();
    await assertion;
  });

  it('times out stalled requests and does not retry automatically', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fetcher: typeof fetch = async (_, init) => {
      calls++;
      return new Promise((_, reject) =>
        init!.signal!.addEventListener('abort', () => reject(new Error('aborted'))),
      );
    };
    const result = sefirahFallback('https://example.test', 'token', fetcher).get(post.id, signal());
    const assertion = expect(result).rejects.toMatchObject({ reason: 'timeout' });
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
    expect(calls).toBe(1);
  });

  it('rejects unsafe origins and pre-cancelled requests without connecting', async () => {
    for (const base of [
      'http://example.test',
      'https://user:password@example.test',
      'https://example.test/path',
      'https://example.test?token=secret',
    ]) {
      expect(() => sefirahFallback(base, 'token')).toThrow('invalid fallback origin');
    }
    const controller = new AbortController();
    controller.abort();
    let called = false;
    const client = sefirahFallback('', 'token', async () => {
      called = true;
      throw new Error('unexpected');
    });
    await expect(client.get(post.id, controller.signal)).rejects.toMatchObject({
      reason: 'cancelled',
    });
    expect(called).toBe(false);
  });
});
