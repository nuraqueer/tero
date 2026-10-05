import { Platform } from 'react-native';
import { bytesToBase64Url, sign, type Identity } from '@tero/crypto';
import {
  signInMessage,
  type ApiErrorCode,
  type ApproveCardRequest,
  type CardListResponse,
  type CardSummary,
  type ChallengeResponse,
  type ClaimCardRequest,
  type ClaimCardResponse,
  type CreateCardRequest,
  type FounderSeatResponse,
  type MeResponse,
  type SignInRequest,
  type SignInResponse,
} from '@tero/protocol';

/** The Worker phones talk to: Tero's one address. */
const defaultServer = 'https://tero.pherus.org';

// The web app is served by the same Worker as the API. Phones talk to it directly.
const base = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'web' ? '' : defaultServer);

/** Where card links point: this site on the web, the default server from the phone apps. */
export function publicOrigin(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return process.env.EXPO_PUBLIC_API_URL ?? defaultServer;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | 'network',
  ) {
    super(`API error ${status} ${code}`);
  }
}

async function request<T>(
  path: string,
  method: string,
  token?: string,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network');
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: ApiErrorCode };
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'bad_request');
  return data as T;
}

/** Proves this phone holds the identity key and returns a session. Nothing secret is sent. */
export async function signIn(identity: Identity): Promise<SignInResponse> {
  const { challenge } = await request<ChallengeResponse>('/api/auth/challenge', 'POST');
  const body: SignInRequest = {
    did: identity.did,
    challenge,
    signature: bytesToBase64Url(sign(signInMessage(challenge), identity.secretKey)),
  };
  return request<SignInResponse>('/api/auth/session', 'POST', undefined, body);
}

/** Calls that need a session token. */
/** Whether the Fool's seat is still open. True only until Tero has its first member. */
export async function founderSeatOpen(): Promise<boolean> {
  return (await request<FounderSeatResponse>('/api/founder', 'GET')).open;
}

export function authed(token: string) {
  return {
    me: () => request<MeResponse>('/api/me', 'GET', token),
    claimFounder: () => request<{ sequence: number }>('/api/founder', 'POST', token),
    listCards: async () => (await request<CardListResponse>('/api/cards', 'GET', token)).cards,
    createCard: (card: CreateCardRequest) =>
      request<CardSummary>('/api/cards', 'POST', token, card),
    claimCard: (cardToken: string) => {
      const body: ClaimCardRequest = { token: cardToken, adult: true };
      return request<ClaimCardResponse>('/api/cards/claim', 'POST', token, body);
    },
    approveCard: (id: string, claimer: string) => {
      const body: ApproveCardRequest = { claimer, adult: true };
      return request<{ sequence: number }>(`/api/cards/${id}/approve`, 'POST', token, body);
    },
    destroyCard: (id: string) => request<void>(`/api/cards/${id}`, 'DELETE', token),
  };
}

export type Api = ReturnType<typeof authed>;
