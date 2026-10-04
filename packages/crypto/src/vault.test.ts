import { describe, expect, it } from 'vitest';
import { randomBytes } from './bytes';
import {
  createVault,
  maxPayloadLength,
  openVault,
  sealSlot,
  type ScryptCost,
  type Slot,
} from './vault';

// Cheap settings so the tests run quickly; the app uses the default cost.
const cost: ScryptCost = { log2N: 4, r: 8, p: 1 };
const device = randomBytes(32);
const other = (slot: Slot): Slot => (slot === 0 ? 1 : 0);

describe('vault', () => {
  it('opens with the passcode and nothing else', async () => {
    const { vault, slot } = await createVault('123456', 'real', device, cost);
    expect(await openVault(vault, '123456', device)).toEqual({ payload: 'real', slot });
    expect(await openVault(vault, '654321', device)).toBeNull();
  });

  it('needs the device secret as well as the passcode', async () => {
    const { vault } = await createVault('123456', 'real', device, cost);
    expect(await openVault(vault, '123456', randomBytes(32))).toBeNull();
  });

  it('opens the decoy slot with the decoy passcode', async () => {
    const { vault, slot } = await createVault('123456', 'real', device, cost);
    const withDecoy = await sealSlot(vault, other(slot), '000111', 'basic', device);
    expect(await openVault(withDecoy, '123456', device)).toEqual({ payload: 'real', slot });
    expect(await openVault(withDecoy, '000111', device)).toEqual({
      payload: 'basic',
      slot: other(slot),
    });
  });

  it('refuses a decoy passcode that matches the real one', async () => {
    const { vault, slot } = await createVault('123456', 'real', device, cost);
    await expect(sealSlot(vault, other(slot), '123456', 'basic', device)).rejects.toThrow();
  });

  it('changes a passcode without touching the other slot', async () => {
    const { vault, slot } = await createVault('123456', 'real', device, cost);
    const withDecoy = await sealSlot(vault, other(slot), '000111', 'basic', device);
    const changed = await sealSlot(withDecoy, slot, '987654', 'real', device);
    expect(await openVault(changed, '123456', device)).toBeNull();
    expect((await openVault(changed, '987654', device))?.payload).toBe('real');
    expect((await openVault(changed, '000111', device))?.payload).toBe('basic');
  });

  it('looks the same with or without a decoy', async () => {
    const { vault, slot } = await createVault('123456', 'r', device, cost);
    const withDecoy = await sealSlot(vault, other(slot), '000111', 'a longer payload', device);
    expect(withDecoy.length).toBe(vault.length);
  });

  it('puts the real slot first or second at random', async () => {
    const slots = new Set<number>();
    for (let i = 0; i < 24 && slots.size < 2; i++) {
      slots.add((await createVault('123456', 'real', device, cost)).slot);
    }
    expect(slots.size).toBe(2);
  });

  it('detects tampering', async () => {
    const { vault } = await createVault('123456', 'real', device, cost);
    // Changing the salt in the header changes every slot key.
    const tampered = vault.slice(0, 8) + (vault[8] === 'A' ? 'B' : 'A') + vault.slice(9);
    expect(await openVault(tampered, '123456', device)).toBeNull();
    await expect(openVault('bm90IGEgdmF1bHQ=', '123456', device)).rejects.toThrow();
  });

  it('holds payloads up to the limit and no more', async () => {
    const longest = 'x'.repeat(maxPayloadLength);
    const { vault } = await createVault('123456', longest, device, cost);
    expect((await openVault(vault, '123456', device))?.payload).toBe(longest);
    await expect(createVault('123456', longest + 'x', device, cost)).rejects.toThrow();
  });
});
