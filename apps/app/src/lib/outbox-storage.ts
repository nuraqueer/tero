import { Directory, File, Paths } from 'expo-file-system';
import { outboxSlotLimit, type OutboxStorage } from './sefirah-outbox';

/** Opaque account namespace, not a key, handle, or DID. */
export function outboxStorage(namespace: string): OutboxStorage {
  if (!/^[A-Za-z0-9_-]{43}$/.test(namespace)) throw new Error('invalid outbox namespace');
  const directory = new Directory(Paths.document, 'sefirah-outbox', namespace);
  const file = (slot: 0 | 1) => new File(directory, `${slot}.box`);
  return {
    read(slot) {
      const source = file(slot);
      if (!source.exists) return null;
      if (source.size > outboxSlotLimit) throw new Error('outbox slot too large');
      return source.textSync();
    },
    write(slot, box) {
      directory.create({ intermediates: true, idempotent: true });
      file(slot).write(box);
    },
  };
}
