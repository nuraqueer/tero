import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { base64UrlToBytes, bytesToBase64Url } from '@tero/crypto';

/*
 * Opt-in Face ID / fingerprint unlock (D48). The seed is kept in the Keychain or
 * Keystore behind the phone's biometrics, so unlocking skips the slow passcode
 * stretching. The phone's own security decides who may read it; if the enrolled faces
 * or fingers change, the item stops opening and Tero falls back to the passcode.
 */

const seedKey = 'tero.biometric.seed';
const onKey = 'tero.biometric.on';

export type BiometricKind = 'face' | 'fingerprint' | 'other';

/** What this phone can do, or null when it has no enrolled biometrics. */
export async function biometricKind(): Promise<BiometricKind | null> {
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) return null;
    if (!(await LocalAuthentication.isEnrolledAsync())) return null;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
    return 'other';
  } catch {
    return null;
  }
}

export async function biometricOn(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(onKey)) === '1';
  } catch {
    return false;
  }
}

/** Keeps the seed behind biometrics. The phone asks for a face or finger to confirm. */
export async function enableBiometric(seed: Uint8Array, prompt: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(seedKey, bytesToBase64Url(seed), {
      requireAuthentication: true,
      authenticationPrompt: prompt,
      keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    });
    await SecureStore.setItemAsync(onKey, '1', {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return true;
  } catch {
    await disableBiometric();
    return false;
  }
}

export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(seedKey).catch(() => undefined);
  await SecureStore.deleteItemAsync(onKey).catch(() => undefined);
}

/**
 * Asks for a face or finger and returns the seed. Null if the person cancels; 'gone'
 * if the item can no longer be read (biometrics changed), which turns the option off.
 */
export async function readBiometricSeed(prompt: string): Promise<Uint8Array | null | 'gone'> {
  try {
    const value = await SecureStore.getItemAsync(seedKey, {
      requireAuthentication: true,
      authenticationPrompt: prompt,
    });
    if (value) return base64UrlToBytes(value);
    await disableBiometric();
    return 'gone';
  } catch (e) {
    const text = String(e);
    // Cancelling is not a failure; a changed or removed key is.
    if (/cancel/i.test(text)) return null;
    if (/invalidat|not found|could not be found|key permanently/i.test(text)) {
      await disableBiometric();
      return 'gone';
    }
    return null;
  }
}
