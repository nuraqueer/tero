/** Development connectivity spike, not the native app transport or private discovery protocol. */
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { identityFromSeed, openPost, randomBytes, sealPost } from '../packages/crypto/src/index';

const torBinary = process.env.SEFIRAH_TOR_BINARY ?? 'tor';
const curl = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), 'sefirah-tor-'));
const socketPath = join(directory, 'peer.sock');
const children: ChildProcess[] = [];
const identity = identityFromSeed(randomBytes(64));
const key = randomBytes(32);
const object = sealPost(
  key,
  identity.secretKey,
  'Sefirah exchange without Cloudflare.',
  Date.now() + 10 * 60 * 1000,
);
const server = createServer((request, response) => {
  if (request.method !== 'GET' || request.url !== `/objects/${object.id}`) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  response.end(JSON.stringify(object));
});

async function startTor(name: string, onion: boolean): Promise<void> {
  const data = join(directory, name);
  await mkdir(data, { mode: 0o700 });
  const config = join(data, 'torrc');
  await writeFile(
    config,
    [
      `DataDirectory ${data}`,
      `SocksPort ${onion ? '0' : '127.0.0.1:19050'}`,
      'ClientOnly 1',
      'SafeSocks 1',
      'AvoidDiskWrites 1',
      'Log notice stdout',
      ...(onion
        ? [`HiddenServiceDir ${join(data, 'onion')}`, `HiddenServicePort 80 unix:${socketPath}`]
        : []),
      '',
    ].join('\n'),
    { mode: 0o600 },
  );
  const child = spawn(torBinary, ['-f', config], { stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => finish(new Error(`${name}: Tor did not bootstrap within 180 seconds`)),
      180_000,
    );
    let buffer = '';
    let lastProgress = -1;
    function finish(error?: Error) {
      clearTimeout(timer);
      child.stdout?.off('data', progress);
      child.off('error', failed);
      child.off('exit', exited);
      error ? reject(error) : resolve();
    }
    function progress(chunk: Buffer) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const match = line.match(/Bootstrapped (\d+)%/);
        if (!match) continue;
        const percent = Number(match[1]);
        if (percent >= lastProgress + 20 || percent === 100) {
          console.log(`${name}: Tor bootstrap ${percent}%`);
          lastProgress = percent;
        }
        if (percent === 100) finish();
      }
    }
    const failed = (error: Error) => finish(error);
    const exited = (code: number | null) =>
      finish(new Error(`${name}: Tor exited before bootstrap (${code})`));
    child.stdout?.on('data', progress);
    // Drain stderr without printing host or network metadata.
    child.stderr?.resume();
    child.once('error', failed);
    child.once('exit', exited);
  });
}

try {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, resolve);
  });
  await Promise.all([startTor('peer', true), startTor('client', false)]);
  const hostname = (await readFile(join(directory, 'peer', 'onion', 'hostname'), 'utf8')).trim();
  if (!/^[a-z2-7]{56}\.onion$/.test(hostname)) throw new Error('Expected a v3 onion address');
  const startedAt = Date.now();
  const { stdout } = await curl(
    'curl',
    [
      '--proxy',
      'socks5h://127.0.0.1:19050',
      '--noproxy',
      '',
      '--proto',
      '=http',
      '--fail',
      '--silent',
      '--show-error',
      '--connect-timeout',
      '30',
      '--max-time',
      '40',
      '--max-filesize',
      '70000',
      '--retry',
      '3',
      '--retry-all-errors',
      '--retry-delay',
      '5',
      `http://${hostname}/objects/${object.id}`,
    ],
    { maxBuffer: 70 * 1024, timeout: 180_000 },
  );
  const post = openPost(key, JSON.parse(stdout), identity.did, Date.now());
  if (post?.text !== 'Sefirah exchange without Cloudflare.')
    throw new Error('Object verification failed');
  console.log(
    `PASS: encrypted object fetched through a v3 onion service and verified in ${Date.now() - startedAt} ms.`,
  );
  console.log(
    'Two Tor instances on one machine. This does not establish phone support, private discovery, audio quality, or performance between separate devices.',
  );
} finally {
  await Promise.all(
    children.map(
      (child) =>
        new Promise<void>((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null) return resolve();
          const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
          child.once('exit', () => {
            clearTimeout(timer);
            resolve();
          });
          child.kill('SIGTERM');
        }),
    ),
  );
  server.closeAllConnections();
  if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(directory, { recursive: true, force: true });
}
