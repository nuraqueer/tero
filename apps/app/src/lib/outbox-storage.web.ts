import { outboxSlotLimit, type OutboxStorage } from './sefirah-outbox';

export function outboxStorage(namespace: string): OutboxStorage {
  if (!/^[A-Za-z0-9_-]{43}$/.test(namespace)) throw new Error('invalid outbox namespace');
  const key = (slot: 0 | 1) => `sefirah-outbox.${namespace}.${slot}`;
  return {
    read(slot) {
      const box = globalThis.localStorage.getItem(key(slot));
      if (box !== null && box.length > outboxSlotLimit) throw new Error('outbox slot too large');
      return box;
    },
    write(slot, box) {
      globalThis.localStorage.setItem(key(slot), box);
    },
  };
}
