/** Live Android harness. Synthetic data only, no Cloudflare or real member account. */
import { spawn, execFile, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createServer, connect, type Socket } from 'node:net';
import { promisify } from 'node:util';
import {
  randomBytes,
  bytesToBase64Url,
  identityFromSeed,
  sealPost,
  openPost,
} from '../packages/crypto/src/index';

const execute = promisify(execFile);
const serial = process.argv[2];
if (!serial || !/^[A-Za-z0-9_.:-]+$/.test(serial))
  throw new Error('Pass the connected Android device serial explicitly.');
const adb =
  process.env.SEFIRAH_ADB ??
  (process.env.ANDROID_HOME ? join(process.env.ANDROID_HOME, 'platform-tools', 'adb') : 'adb');
const tor = process.env.SEFIRAH_TOR_BINARY ?? 'tor';
const binary = resolve(
  'apps/app/modules/sefirah-tor/native/target/aarch64-linux-android/release/sefirah-node',
);
const randomId = () => bytesToBase64Url(randomBytes(16));
const handle = randomId();
const capability = bytesToBase64Url(randomBytes(32));
const remote = `/data/local/tmp/sefirah-${handle}`;
const directory = await mkdtemp(join(tmpdir(), 'sefirah-android-'));
let android: ChildProcessWithoutNullStreams | undefined;
let hostTor: ReturnType<typeof spawn> | undefined;
let hostBootstrapTimer: ReturnType<typeof setTimeout> | undefined;
const sockets = new Set<Socket>();
let pending:
  | {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  | undefined;
let output = '';
const identity = identityFromSeed(randomBytes(64));
const contentKey = randomBytes(32);
const object = sealPost(
  contentKey,
  identity.secretKey,
  'Live Android Sefirah exchange.',
  Date.now() + 30 * 60_000,
);

const frame = (value: unknown) => {
  const payload = Buffer.from(JSON.stringify(value));
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(payload.length);
  return Buffer.concat([prefix, payload]);
};
function readFrame(socket: Socket, initial = Buffer.alloc(0)): Promise<unknown> {
  return new Promise((resolveFrame, reject) => {
    let data = initial;
    const timer = setTimeout(() => finish(new Error('peer frame deadline')), 60_000);
    function finish(error?: Error, value?: unknown) {
      clearTimeout(timer);
      socket.off('data', received);
      socket.off('error', failed);
      socket.off('end', ended);
      error ? reject(error) : resolveFrame(value);
    }
    function received(chunk: Buffer) {
      data = Buffer.concat([data, chunk]);
      if (data.length > 70 * 1024 + 4) return finish(new Error('peer frame too large'));
      if (data.length < 4) return;
      const length = data.readUInt32BE();
      if (length < 1 || length > 70 * 1024) return finish(new Error('invalid peer frame'));
      if (data.length >= length + 4) {
        try {
          finish(undefined, JSON.parse(data.subarray(4, length + 4).toString('utf8')));
        } catch {
          finish(new Error('invalid peer JSON'));
        }
      }
    }
    const failed = (error: Error) => finish(error);
    const ended = () => finish(new Error('incomplete peer frame'));
    socket.on('data', received);
    socket.once('error', failed);
    socket.once('end', ended);
    if (data.length) received(Buffer.alloc(0));
  });
}
const server = createServer((socket) => {
  sockets.add(socket);
  socket.once('close', () => sockets.delete(socket));
  void (async () => {
    try {
      const req = (await readFrame(socket)) as Record<string, unknown>;
      if (req.v !== 1 || req.op !== 'get' || req.id !== object.id || req.capability !== capability)
        throw new Error('invalid test request');
      socket.end(frame({ v: 1, object }));
    } catch {
      socket.destroy();
    }
  })();
});
const adbCommand = (...args: string[]) =>
  execute(adb, ['-s', serial, ...args], { timeout: 30_000, maxBuffer: 70 * 1024 });
function command(value: Record<string, unknown>): Promise<unknown> {
  if (!android || pending) throw new Error('Android harness unavailable');
  return new Promise((resolveCommand, reject) => {
    const timer = setTimeout(() => {
      pending = undefined;
      reject(new Error('Android command deadline'));
    }, 190_000);
    pending = { resolve: resolveCommand, reject, timer };
    android!.stdin.write(`${JSON.stringify(value)}\n`);
  });
}
async function startHostTor() {
  await mkdir(join(directory, 'tor'), { mode: 0o700 });
  const config = join(directory, 'torrc');
  await writeFile(
    config,
    [
      `DataDirectory ${join(directory, 'tor')}`,
      'SocksPort 127.0.0.1:19051',
      'SafeSocks 1',
      'ClientOnly 1',
      'Log notice stdout',
      `HiddenServiceDir ${join(directory, 'onion')}`,
      `HiddenServicePort 80 unix:${join(directory, 'peer.sock')}`,
      '',
    ].join('\n'),
    { mode: 0o600 },
  );
  hostTor = spawn(tor, ['-f', config], { stdio: ['ignore', 'pipe', 'pipe'] });
  hostTor.stderr?.resume();
  await new Promise<void>((resolveTor, reject) => {
    let buffer = '';
    hostBootstrapTimer = setTimeout(
      () => reject(new Error('host Tor bootstrap deadline')),
      180_000,
    );
    hostTor!.once('error', reject);
    hostTor!.once('exit', () => reject(new Error('host Tor exited')));
    hostTor!.stdout!.on('data', (chunk: Buffer) => {
      buffer = (buffer + chunk.toString()).slice(-8192);
      if (buffer.includes('Bootstrapped 100%')) {
        clearTimeout(hostBootstrapTimer);
        resolveTor();
      }
    });
  });
}
async function throughSocks(onion: string): Promise<Socket> {
  if (!/^[a-z2-7]{56}\.onion$/.test(onion)) throw new Error('non-onion test target');
  const socket = connect(19051, '127.0.0.1');
  sockets.add(socket);
  socket.once('close', () => sockets.delete(socket));
  await new Promise<void>((resolveSocket, reject) => {
    socket.once('connect', resolveSocket);
    socket.once('error', reject);
  });
  async function readBytes(length: number): Promise<Buffer> {
    return new Promise((resolveBytes, reject) => {
      let data = Buffer.alloc(0);
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('SOCKS deadline'));
      }, 60_000);
      function received(chunk: Buffer) {
        data = Buffer.concat([data, chunk]);
        if (data.length < length) return;
        clearTimeout(timer);
        socket.off('data', received);
        socket.off('error', failed);
        socket.off('end', ended);
        if (data.length > length) socket.unshift(data.subarray(length));
        resolveBytes(data.subarray(0, length));
      }
      function failed(error: Error) {
        clearTimeout(timer);
        reject(error);
      }
      function ended() {
        failed(new Error('SOCKS closed'));
      }
      socket.on('data', received);
      socket.once('error', failed);
      socket.once('end', ended);
    });
  }
  const greeting = readBytes(2);
  socket.write(Buffer.from([5, 1, 0]));
  if (!(await greeting).equals(Buffer.from([5, 0]))) throw new Error('SOCKS greeting rejected');
  const name = Buffer.from(onion);
  const accepted = readBytes(10);
  socket.write(Buffer.concat([Buffer.from([5, 1, 0, 3, name.length]), name, Buffer.from([0, 80])]));
  const response = await accepted;
  if (response[0] !== 5 || response[1] !== 0 || response[3] !== 1)
    throw new Error('SOCKS connect rejected');
  return socket;
}

try {
  await new Promise<void>((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(join(directory, 'peer.sock'), resolveServer);
  });
  await adbCommand('shell', 'mkdir', '-m', '700', remote);
  await adbCommand('push', binary, `${remote}/sefirah-node`);
  await adbCommand('shell', 'chmod', '700', `${remote}/sefirah-node`);
  android = spawn(adb, ['-s', serial, 'shell', '-T', `${remote}/sefirah-node`], { stdio: 'pipe' });
  android.stderr.resume();
  android.stdout.on('data', (chunk: Buffer) => {
    output += chunk.toString();
    if (output.length > 150 * 1024) {
      android?.kill();
      return;
    }
    const lines = output.split('\n');
    output = lines.pop() ?? '';
    for (const line of lines) {
      if (!pending) continue;
      const current = pending;
      pending = undefined;
      clearTimeout(current.timer);
      try {
        const response = JSON.parse(line).response;
        if (response.ok !== true) throw new Error(`Android native failure: ${response.error}`);
        current.resolve(response.value);
      } catch (error) {
        current.reject(error instanceof Error ? error : new Error('Android reply invalid'));
      }
    }
  });
  android.once('exit', () => {
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Android native process exited'));
      pending = undefined;
    }
  });
  console.log('Bootstrapping embedded Arti on Android and a separate desktop Tor peer.');
  const [phone] = await Promise.all([
    command({ op: 'start', handle, request: randomId(), directory: `${remote}/state`, capability }),
    startHostTor(),
  ]);
  console.log('Both Tor endpoints bootstrapped. Testing encrypted exchange in both directions.');
  const hostOnion = (await readFile(join(directory, 'onion', 'hostname'), 'utf8')).trim();
  let received: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      received = await command({
        op: 'get',
        handle,
        request: randomId(),
        onion: hostOnion,
        capability,
        id: object.id,
      });
      break;
    } catch (error) {
      if (attempt === 2) throw error;
      console.log('Retrying onion publication/connectivity.');
    }
  }
  if (
    openPost(contentKey, received, identity.did, Date.now())?.text !==
    'Live Android Sefirah exchange.'
  )
    throw new Error('Android retrieval verification failed');
  await command({ op: 'offer', handle, object });
  const phoneOnion = (phone as { onion: string }).onion;
  let reverse: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    let socket: Socket | undefined;
    try {
      socket = await throughSocks(phoneOnion);
      const reply = readFrame(socket);
      socket.write(frame({ v: 1, op: 'get', id: object.id, capability }));
      reverse = ((await reply) as { object: unknown }).object;
      break;
    } catch (error) {
      if (attempt === 2) throw error;
      console.log('Retrying Android onion availability.');
    } finally {
      socket?.destroy();
    }
  }
  if (
    openPost(contentKey, reverse, identity.did, Date.now())?.text !==
    'Live Android Sefirah exchange.'
  )
    throw new Error('Android service verification failed');
  await command({ op: 'stop', handle });
  console.log(
    'PASS: physical Android native Arti fetched and served a signed encrypted object over Tor, without Cloudflare.',
  );
  console.log('Rust core harness only; Expo/JNI and iOS runtime verification are separate.');
} finally {
  clearTimeout(hostBootstrapTimer);
  for (const socket of sockets) socket.destroy();
  contentKey.fill(0);
  if (pending) {
    clearTimeout(pending.timer);
    pending = undefined;
  }
  android?.stdin.end();
  android?.kill('SIGTERM');
  if (hostTor && hostTor.exitCode === null) {
    await new Promise<void>((resolveExit) => {
      const timer = setTimeout(() => hostTor!.kill('SIGKILL'), 5000);
      hostTor!.once('exit', () => {
        clearTimeout(timer);
        resolveExit();
      });
      hostTor!.kill('SIGTERM');
    });
  }
  server.close();
  await adbCommand('shell', 'rm', '-rf', remote).catch(() => undefined);
  await rm(directory, { recursive: true, force: true });
}
