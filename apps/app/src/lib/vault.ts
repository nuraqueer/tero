import {
  base64UrlToBytes,
  bytesToBase64Url,
  createVault,
  openVault,
  randomBytes,
  sealSlot,
} from '@tero/crypto';
import { deleteItem, getItem, setItem } from './secure-storage';

const keys = {
  vault: 'tero.vault',
  device: 'tero.device',
  failures: 'tero.failures',
} as const;

/** What each vault slot holds. The basic slot holds nothing personal. */
type Payload = { v: 1; mode: 'full'; phrase: string } | { v: 1; mode: 'basic' };

export type Unlocked = { mode: 'full'; phrase: string } | { mode: 'basic' };

export type UnlockResult = { ok: true; value: Unlocked } | { ok: false; waitMs: number };

/** Wrong tries allowed before Tero makes the person wait. */
const freeTries = 5;
const firstWaitMs = 30_000;
const longestWaitMs = 60 * 60_000;

type Failures = { count: number; until: number };

export async function hasVault(): Promise<boolean> {
  return (await getItem(keys.vault)) !== null;
}

/** Saves a new vault: the real slot holds the phrase, the decoy slot opens the basic view. */
export async function saveNewVault(phrase: string, passcode: string, decoyPasscode: string) {
  if (passcode === decoyPasscode) throw new Error('decoy must differ from passcode');
  const device = randomBytes(32);
  const full: Payload = { v: 1, mode: 'full', phrase };
  const basic: Payload = { v: 1, mode: 'basic' };
  const { vault, slot } = await createVault(passcode, JSON.stringify(full), device);
  const withDecoy = await sealSlot(
    vault,
    slot === 0 ? 1 : 0,
    decoyPasscode,
    JSON.stringify(basic),
    device,
  );
  await setItem(keys.device, bytesToBase64Url(device));
  await setItem(keys.vault, withDecoy);
  await deleteItem(keys.failures);
}

async function readFailures(): Promise<Failures> {
  try {
    const value = JSON.parse((await getItem(keys.failures)) ?? '') as Failures;
    if (Number.isFinite(value.count) && Number.isFinite(value.until)) return value;
  } catch {
    // No record yet.
  }
  return { count: 0, until: 0 };
}

/** How long to wait after this many wrong tries in a row. Doubles each time, up to an hour. */
export function waitAfter(count: number): number {
  if (count < freeTries) return 0;
  return Math.min(firstWaitMs * 2 ** (count - freeTries), longestWaitMs);
}

export async function unlock(passcode: string, now = Date.now()): Promise<UnlockResult> {
  const failures = await readFailures();
  if (failures.until > now) return { ok: false, waitMs: failures.until - now };

  // Count the try as wrong before checking it, so closing the app mid-check doesn't
  // skip the wait. A right passcode clears the count.
  const count = failures.count + 1;
  const waitMs = waitAfter(count);
  await setItem(keys.failures, JSON.stringify({ count, until: now + waitMs }));

  const [vault, deviceText] = await Promise.all([getItem(keys.vault), getItem(keys.device)]);
  const device = deviceText ? base64UrlToBytes(deviceText) : null;
  const opened = vault && device ? await openVault(vault, passcode, device) : null;
  if (!opened) return { ok: false, waitMs };

  await deleteItem(keys.failures);
  const payload = JSON.parse(opened.payload) as Payload;
  return {
    ok: true,
    value: payload.mode === 'full' ? { mode: 'full', phrase: payload.phrase } : { mode: 'basic' },
  };
}
