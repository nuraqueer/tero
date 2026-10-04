// Browsers have no secure hardware store that a web page can use like this, so the
// web version keeps the vault in local storage. The vault is still encrypted, but the
// device secret sits beside it: on the web, the passcode is the only protection.
// The phone apps are the safer choice, and Tero says so to people in high-risk places.

export async function getItem(key: string): Promise<string | null> {
  return globalThis.localStorage?.getItem(key) ?? null;
}

export async function setItem(key: string, value: string): Promise<void> {
  globalThis.localStorage.setItem(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  globalThis.localStorage?.removeItem(key);
}
