import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { base64UrlToBytes, bytesToBase64Url } from '@tero/crypto';

/*
 * Opt-in Face ID / fingerprint unlock (D48). The seed is kept in the Keychain or
 * Keystore on this device only, and only while the phone has its own passcode set; Tero
 * hands it over after the phone confirms the owner (Face ID, fingerprint, or the phone's
 * own passcode as the usual fallback). Unlocking this way skips the slow passcode
 * stretching.
 */

const seedKey = 'tero.biometric.seed';
const onKey = 'tero.biometric.on';
const storeOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
};

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
    return (await SecureStore.getItemAsync(onKey, storeOptions)) === '1';
  } catch {
    return false;
  }
}

/** The phone's own check: Face ID or fingerprint, with its passcode as the fallback. */
async function confirmOwner(prompt: string): Promise<'ok' | 'cancelled' | 'failed'> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      cancelLabel: undefined,
      disableDeviceFallback: false,
    });
    if (result.success) return 'ok';
    return result.error === 'user_cancel' ||
      result.error === 'system_cancel' ||
      result.error === 'app_cancel'
      ? 'cancelled'
      : 'failed';
  } catch {
    return 'failed';
  }
}

/** Turns it on: the phone confirms the owner, then the seed is kept on this device. */
export async function enableBiometric(
  seed: Uint8Array,
  prompt: string,
): Promise<'on' | 'cancelled' | 'failed'> {
  const check = await confirmOwner(prompt);
  if (check !== 'ok') return check;
  try {
    await SecureStore.setItemAsync(seedKey, bytesToBase64Url(seed), storeOptions);
    await SecureStore.setItemAsync(onKey, '1', storeOptions);
    return 'on';
  } catch {
    await disableBiometric();
    return 'failed';
  }
}

export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(seedKey, storeOptions).catch(() => undefined);
  await SecureStore.deleteItemAsync(onKey, storeOptions).catch(() => undefined);
}

/**
 * Asks the phone to confirm the owner and returns the seed. Null if they cancel or it
 * fails; 'gone' if the seed is no longer there (for example the phone's passcode was
 * removed), which turns the option off.
 */
export async function readBiometricSeed(prompt: string): Promise<Uint8Array | null | 'gone'> {
  if ((await confirmOwner(prompt)) !== 'ok') return null;
  try {
    const value = await SecureStore.getItemAsync(seedKey, storeOptions);
    if (value) return base64UrlToBytes(value);
  } catch {
    // Fall through: treat as gone.
  }
  await disableBiometric();
  return 'gone';
}
