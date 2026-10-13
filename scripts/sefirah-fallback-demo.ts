/** Local development fixture only. These deterministic accounts must never be used for real members. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  base64UrlToBytes,
  bytesToBase64Url,
  cardIdFromToken,
  cardToken,
  deriveSecret,
  identityFromSeed,
  openPost,
  randomBytes,
  sealPost,
  sign,
} from '../packages/crypto/src/index';
import { signInMessage } from '../packages/protocol/src/index';
import { SefirahOutbox } from '../apps/app/src/lib/sefirah-outbox';
import { sefirahFallback } from '../apps/app/src/lib/sefirah-fallback';

const phase = process.argv[2];
const base = new URL(process.argv[3] ?? 'http://127.0.0.1:8793');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) {
  throw new Error(
    'This fixture is restricted to localhost. It must never use real member accounts.',
  );
}
const fixturePath = process.argv[4] ?? join(tmpdir(), 'tero-sefirah-fallback-fixture.json');
const aliceSeed = new Uint8Array(64).fill(21);
const alice = identityFromSeed(aliceSeed);
const bob = identityFromSeed(new Uint8Array(64).fill(22));

async function api(path: string, method = 'GET', token?: string, body?: unknown) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function session(identity: typeof alice): Promise<string> {
  const { challenge } = await api('/api/auth/challenge', 'POST');
  const { token } = await api('/api/auth/session', 'POST', undefined, {
    did: identity.did,
    challenge,
    signature: bytesToBase64Url(sign(signInMessage(challenge), identity.secretKey)),
  });
  return token;
}

if (phase === 'publish') {
  const aliceToken = await session(alice);
  if (!(await api('/api/me', 'GET', aliceToken)).member) {
    if (!(await api('/api/founder')).open)
      throw new Error('Use a fresh local persistence directory.');
    await api('/api/founder', 'POST', aliceToken);
  }
  const bobToken = await session(bob);
  if (!(await api('/api/me', 'GET', bobToken)).member) {
    const nonce = randomBytes(16);
    const token = cardToken(deriveSecret(aliceSeed, 'cards'), nonce);
    const id = cardIdFromToken(token);
    await api('/api/cards', 'POST', aliceToken, {
      id,
      nonce: bytesToBase64Url(nonce),
      type: 'member',
    });
    await api('/api/cards/claim', 'POST', bobToken, { token, adult: true });
    await api(`/api/cards/${id}/approve`, 'POST', aliceToken, { claimer: bob.did, adult: true });
  }
  const key = randomBytes(32);
  const object = sealPost(
    key,
    alice.secretKey,
    'Alice posted before Bob returned.',
    Date.now() + 60 * 60 * 1000,
  );
  const queueStorage = {
    read(slot: 0 | 1) {
      const path = `${fixturePath}.outbox-${slot}`;
      return existsSync(path) ? readFileSync(path, 'utf8') : null;
    },
    write(slot: 0 | 1, box: string) {
      writeFileSync(`${fixturePath}.outbox-${slot}`, box, { mode: 0o600 });
    },
  };
  const queueKey = deriveSecret(aliceSeed, 'app', 1);
  const queue = new SefirahOutbox(queueStorage, queueKey);
  queue.enqueue(object);
  queue.close();
  const restored = new SefirahOutbox(queueStorage, queueKey);
  const transport = sefirahFallback(base.origin, aliceToken);
  const receipt = await restored.deliver(object.id, transport);
  const retry = await transport.put(object, new AbortController().signal);
  restored.close();
  queueKey.fill(0);
  if (JSON.stringify(receipt) !== JSON.stringify(retry))
    throw new Error('Retry changed the receipt');
  writeFileSync(
    fixturePath,
    JSON.stringify({ key: bytesToBase64Url(key), id: object.id, receipt }),
    { mode: 0o600 },
  );
  console.log(
    'Reopened encrypted device queue, uploaded through fallback adapter, and checked duplicate receipt. Sender process exits now.',
  );
  console.log(
    `Restart the local Worker with the same persistence directory, then run this fixture with "read". Fixture: ${fixturePath}`,
  );
} else if (phase === 'read') {
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const key = base64UrlToBytes(fixture.key);
  if (!key) throw new Error('Invalid fixture key');
  const token = await session(bob);
  const transport = sefirahFallback(base.origin, token);
  for (let attempt = 0; attempt < 2; attempt++) {
    const object = await transport.get(fixture.id, new AbortController().signal);
    const post = openPost(key, object, alice.did, Date.now());
    if (post?.text !== 'Alice posted before Bob returned.') throw new Error('Verification failed');
  }
  console.log(
    'PASS: later recipient retrieved and verified the post twice without the sender process.',
  );
} else {
  throw new Error(
    'Usage: bun scripts/sefirah-fallback-demo.ts publish|read [local URL] [fixture path]',
  );
}
