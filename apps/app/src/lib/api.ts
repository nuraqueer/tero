import { Platform } from 'react-native';
import { bytesToBase64Url, sign, type Identity } from '@tero/crypto';
import {
  signInMessage,
  type ChallengeResponse,
  type SignInRequest,
  type SignInResponse,
} from '@tero/protocol';

// The web app is served by the same Worker as the API. Phones talk to it directly.
const base =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'web' ? '' : 'https://tero.pherus.org');

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  return (await res.json()) as T;
}

/** Proves this phone holds the identity key and returns a session. Nothing secret is sent. */
export async function signIn(identity: Identity): Promise<SignInResponse> {
  const { challenge } = await post<ChallengeResponse>('/api/auth/challenge');
  const request: SignInRequest = {
    did: identity.did,
    challenge,
    signature: bytesToBase64Url(sign(signInMessage(challenge), identity.secretKey)),
  };
  return post<SignInResponse>('/api/auth/session', request);
}
