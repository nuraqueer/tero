import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { base64 } from '@scure/base';

/*
 * The vault on the phone: two slots that look exactly alike.
 *
 * One slot opens with the real passcode, the other with the decoy passcode. A slot
 * with no passcode yet is filled with random bytes, and the slots are in random
 * order, so nobody looking at the vault can tell whether a decoy is set or which
 * slot holds the real keys.
 *
 * Each slot key mixes the passcode (stretched with scrypt) with a device secret held
 * in the phone's secure hardware. A six-digit passcode alone is easy to guess
 * offline; with the device secret, guessing needs the phone itself.
 */

const version = 1;
const saltLength = 16;
const nonceLength = 24;
const tagLength = 16;
/** Every slot holds exactly this many bytes of plaintext, so their sizes say nothing. */
export const slotPlaintextLength = 512;
/** The longest payload a slot can hold (two bytes record its length). */
export const maxPayloadLength = slotPlaintextLength - 2;
const slotLength = nonceLength + slotPlaintextLength + tagLength;
const headerLength = 4 + saltLength;
const slotInfo = utf8ToBytes('tero/vault-slot/v1');

export type ScryptCost = { log2N: number; r: number; p: number };

/** About 16 MB of memory per attempt; the device secret carries most of the strength. */
export const defaultCost: ScryptCost = { log2N: 14, r: 8, p: 1 };

export type Slot = 0 | 1;

type Parsed = {
  header: Uint8Array;
  cost: ScryptCost;
  salt: Uint8Array;
  slots: [Uint8Array, Uint8Array];
};

function parse(vault: string): Parsed {
  const bytes = base64.decode(vault);
  if (bytes.length !== headerLength + 2 * slotLength || bytes[0] !== version) {
    throw new Error('not a Tero vault');
  }
  const header = bytes.slice(0, headerLength);
  return {
    header,
    cost: { log2N: bytes[1]!, r: bytes[2]!, p: bytes[3]! },
    salt: bytes.slice(4, headerLength),
    slots: [
      bytes.slice(headerLength, headerLength + slotLength),
      bytes.slice(headerLength + slotLength),
    ],
  };
}

function serialize(header: Uint8Array, slots: [Uint8Array, Uint8Array]): string {
  return base64.encode(concatBytes(header, slots[0], slots[1]));
}

async function slotKey(
  passcode: string,
  parsed: Pick<Parsed, 'cost' | 'salt'>,
  deviceSecret: Uint8Array,
) {
  const { log2N, r, p } = parsed.cost;
  const stretched = await scryptAsync(utf8ToBytes(passcode), parsed.salt, {
    N: 2 ** log2N,
    r,
    p,
    dkLen: 32,
  });
  return hkdf(sha256, concatBytes(stretched, deviceSecret), undefined, slotInfo, 32);
}

function seal(key: Uint8Array, header: Uint8Array, payload: string): Uint8Array {
  const data = utf8ToBytes(payload);
  if (data.length > maxPayloadLength) throw new Error('vault payload is too long');
  const plaintext = randomBytes(slotPlaintextLength);
  plaintext[0] = data.length >> 8;
  plaintext[1] = data.length & 0xff;
  plaintext.set(data, 2);
  const nonce = randomBytes(nonceLength);
  return concatBytes(nonce, xchacha20poly1305(key, nonce, header).encrypt(plaintext));
}

function unseal(key: Uint8Array, header: Uint8Array, slot: Uint8Array): string | null {
  let plaintext: Uint8Array;
  try {
    plaintext = xchacha20poly1305(key, slot.subarray(0, nonceLength), header).decrypt(
      slot.subarray(nonceLength),
    );
  } catch {
    return null;
  }
  const length = (plaintext[0]! << 8) | plaintext[1]!;
  if (length > maxPayloadLength) return null;
  return new TextDecoder().decode(plaintext.subarray(2, 2 + length));
}

/**
 * Makes a vault with one slot sealed under the passcode and the other left random.
 * Returns the vault and the slot used, so the other can be given a decoy.
 */
export async function createVault(
  passcode: string,
  payload: string,
  deviceSecret: Uint8Array,
  cost: ScryptCost = defaultCost,
): Promise<{ vault: string; slot: Slot }> {
  const header = new Uint8Array(headerLength);
  header.set([version, cost.log2N, cost.r, cost.p], 0);
  header.set(randomBytes(saltLength), 4);
  const parsed = parse(serialize(header, [randomBytes(slotLength), randomBytes(slotLength)]));
  const key = await slotKey(passcode, parsed, deviceSecret);
  const slot: Slot = randomBytes(1)[0]! & 1 ? 1 : 0;
  parsed.slots[slot] = seal(key, header, payload);
  return { vault: serialize(header, parsed.slots), slot };
}

/** Tries the passcode on both slots. Returns the payload and which slot opened, or null. */
export async function openVault(
  vault: string,
  passcode: string,
  deviceSecret: Uint8Array,
): Promise<{ payload: string; slot: Slot } | null> {
  const parsed = parse(vault);
  const key = await slotKey(passcode, parsed, deviceSecret);
  // Always try both slots, so the time taken doesn't say which one opened.
  const results = parsed.slots.map((slot) => unseal(key, parsed.header, slot));
  if (results[0] !== null && results[0] !== undefined) return { payload: results[0], slot: 0 };
  if (results[1] !== null && results[1] !== undefined) return { payload: results[1], slot: 1 };
  return null;
}

/**
 * Seals a payload into one slot under a passcode, replacing what was there. Used to
 * change a passcode, or to set the decoy in the slot the real passcode didn't open.
 * Refuses a passcode that already opens the other slot.
 */
export async function sealSlot(
  vault: string,
  slot: Slot,
  passcode: string,
  payload: string,
  deviceSecret: Uint8Array,
): Promise<string> {
  const parsed = parse(vault);
  const key = await slotKey(passcode, parsed, deviceSecret);
  const other: Slot = slot === 0 ? 1 : 0;
  if (unseal(key, parsed.header, parsed.slots[other]) !== null) {
    throw new Error('passcode already opens the other slot');
  }
  parsed.slots[slot] = seal(key, parsed.header, payload);
  return serialize(parsed.header, parsed.slots);
}
