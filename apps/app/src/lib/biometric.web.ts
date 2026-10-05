/* The web has no biometric unlock: browsers keep nothing in secure hardware for Tero. */

export type BiometricKind = 'face' | 'fingerprint' | 'other';

export const biometricKind = async (): Promise<BiometricKind | null> => null;
export const biometricOn = async () => false;
export const enableBiometric = async (
  _seed: Uint8Array,
  _prompt: string,
): Promise<'on' | 'cancelled' | 'failed'> => 'failed';
export const disableBiometric = async () => undefined;
export const readBiometricSeed = async (_prompt: string): Promise<Uint8Array | null | 'gone'> =>
  null;
