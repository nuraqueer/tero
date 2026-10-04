import { getRandomValues } from 'expo-crypto';

// The crypto libraries draw randomness from crypto.getRandomValues, which React Native
// doesn't provide. expo-crypto fills it from the phone's secure random source.
const g = globalThis as { crypto?: { getRandomValues?: unknown } };
if (typeof g.crypto?.getRandomValues !== 'function') {
  g.crypto = { ...g.crypto, getRandomValues };
}
