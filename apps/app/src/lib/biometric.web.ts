/* The web has no biometric unlock: browsers keep nothing in secure hardware for Tero. */

export type BiometricKind = 'faceId' | 'touchId' | 'fingerprint' | 'face' | 'biometric';
export type BiometricSupport =
  | { ok: true; kind: BiometricKind }
  | { ok: false; reason: 'expoGo'; kind: BiometricKind }
  | { ok: false; reason: 'none' };

export const biometricSupport = async (): Promise<BiometricSupport> => ({
  ok: false,
  reason: 'none',
});
export const biometricOn = async () => false;
export const biometricAsked = async () => true;
export const setBiometricAsked = async () => undefined;
export const enableBiometric = async (
  _seed: Uint8Array,
  _prompt: string,
  _cancel: string,
): Promise<'on' | 'cancelled' | 'failed'> => 'failed';
export const disableBiometric = async () => undefined;
export const readBiometricSeed = async (
  _prompt: string,
  _cancel: string,
): Promise<Uint8Array | null | 'gone'> => null;
