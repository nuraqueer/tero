import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { base64UrlToBytes, bytesToBase64Url } from '@tero/crypto';

/*
 * Opt-in Face ID / Touch ID / fingerprint / face unlock (D48). The seed is kept in the
 * Keychain or Keystore on this device only, while the phone has a passcode. Tero hands
 * it over after the phone's biometric check; if that fails, the member types Tero's
 * own passcode (not the phone's). Unlocking this way skips the slow passcode stretching.
 */

const seedKey = 'tero.biometric.seed';
const onKey = 'tero.biometric.on';
const askedKey = 'tero.biometric.asked';
const storeOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
};

/** What to call it on this phone. */
export type BiometricKind = 'faceId' | 'touchId' | 'fingerprint' | 'face' | 'biometric';

export type BiometricSupport =
  | { ok: true; kind: BiometricKind }
  /** Expo Go on iPhone can't use Face ID; the Tero app build can. */
  | { ok: false; reason: 'expoGo'; kind: BiometricKind }
  | { ok: false; reason: 'none' };

const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function biometricSupport(): Promise<BiometricSupport> {
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) return { ok: false, reason: 'none' };
    if (!(await LocalAuthentication.isEnrolledAsync())) return { ok: false, reason: 'none' };
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    let kind: BiometricKind;
    if (Platform.OS === 'ios') kind = face ? 'faceId' : 'touchId';
    else kind = face && finger ? 'biometric' : face ? 'face' : finger ? 'fingerprint' : 'biometric';
    if (Platform.OS === 'ios' && kind === 'faceId' && inExpoGo)
      return { ok: false, reason: 'expoGo', kind };
    return { ok: true, kind };
  } catch {
    return { ok: false, reason: 'none' };
  }
}

export async function biometricOn(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(onKey, storeOptions)) === '1';
  } catch {
    return false;
  }
}

/** Whether Tero has already offered it once on this phone. */
export async function biometricAsked(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(askedKey, storeOptions)) === '1';
  } catch {
    return true;
  }
}

export async function setBiometricAsked(): Promise<void> {
  await SecureStore.setItemAsync(askedKey, '1', storeOptions).catch(() => undefined);
}

/** The phone's biometric check only; on failure Tero's own passcode is the way in. */
async function check(prompt: string, cancel: string): Promise<'ok' | 'cancelled' | 'failed'> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      cancelLabel: cancel,
      disableDeviceFallback: true,
      fallbackLabel: '',
    });
    if (result.success) return 'ok';
    return ['user_cancel', 'system_cancel', 'app_cancel', 'user_fallback'].includes(result.error)
      ? 'cancelled'
      : 'failed';
  } catch {
    return 'failed';
  }
}

/** Turns it on: one biometric check, then the seed is kept on this device. */
export async function enableBiometric(
  seed: Uint8Array,
  prompt: string,
  cancel: string,
): Promise<'on' | 'cancelled' | 'failed'> {
  const result = await check(prompt, cancel);
  if (result !== 'ok') return result;
  try {
    await SecureStore.setItemAsync(seedKey, bytesToBase64Url(seed), storeOptions);
    await SecureStore.setItemAsync(onKey, '1', storeOptions);
    await setBiometricAsked();
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

/** Account switching must fail visibly if a stored biometric seed cannot be removed. */
export async function forgetBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(seedKey, storeOptions);
  await SecureStore.deleteItemAsync(onKey, storeOptions);
  await SecureStore.deleteItemAsync(askedKey, storeOptions);
}

/**
 * The biometric check, then the seed. Null if cancelled or not recognised (the passcode
 * is the way in then); 'gone' if the seed is no longer there, which turns the option off.
 */
export async function readBiometricSeed(
  prompt: string,
  cancel: string,
): Promise<Uint8Array | null | 'gone'> {
  if ((await check(prompt, cancel)) !== 'ok') return null;
  try {
    const value = await SecureStore.getItemAsync(seedKey, storeOptions);
    if (value) return base64UrlToBytes(value);
  } catch {
    // Treat as gone.
  }
  await disableBiometric();
  return 'gone';
}
