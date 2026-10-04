import * as SecureStore from 'expo-secure-store';

// iOS Keychain or Android Keystore. Kept on this device only (never in backups),
// and readable only while the phone is unlocked.
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export function getItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key, options);
}

export function setItem(key: string, value: string): Promise<void> {
  return SecureStore.setItemAsync(key, value, options);
}

export function deleteItem(key: string): Promise<void> {
  return SecureStore.deleteItemAsync(key, options);
}
