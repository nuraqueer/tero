import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import {
  bytesToBase64Url,
  sign,
  type Identity,
  type DirectoryGrant,
  type ProfileEnvelope,
} from '@tero/crypto';
import {
  type DiscoveryPage,
  type ConnectionSummary,
  type ConnectionAction,
  signInMessage,
  type ApiErrorCode,
  type ApproveCardRequest,
  type CardListResponse,
  type CardSummary,
  type ChallengeResponse,
  type ClaimCardRequest,
  type ClaimCardResponse,
  type AidListResponse,
  type AidRepliesResponse,
  type CreateCardRequest,
  type JobListResponse,
  type NewAidPost,
  type NewJob,
  type NewSkill,
  type NewStory,
  type SkillListResponse,
  type StoryListResponse,
  type DirectoryPart,
  type NewPlace,
  type PlaceListResponse,
  type FounderSeatResponse,
  type JourneyBoxResponse,
  type MeResponse,
  type SignInRequest,
  type SignInResponse,
  type StatusResponse,
  type NetworkSizeResponse,
} from '@tero/protocol';
import { chatApi } from './chat-api';
import { isTestingBuild } from './testing-build';
import { sefirahFallback } from './sefirah-fallback';

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
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
    });
    if (res.status === 204) return undefined as T;
    const data = (await res.json()) as { error?: ApiErrorCode };
    if (!data || typeof data !== 'object') throw new ApiError(res.status, 'bad_request');
    if (!res.ok) throw new ApiError(res.status, data.error ?? 'bad_request');
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'network');
  } finally {
    clearTimeout(deadline);
  }
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

/** Whether the Fool's seat is still open. True only until Tero has its first member. */
export async function founderSeatOpen(): Promise<boolean> {
  return (await request<FounderSeatResponse>('/api/founder', 'GET')).open;
}

/** Calls that need a session token. */
export function authed(token: string) {
  return {
    chatPresence: (peer: string) =>
      request<{ presence: unknown }>(
        `/api/chat/${encodeURIComponent(peer)}/presence`,
        'GET',
        token,
      ),
    setChatPresence: (peer: string, value: import('@tero/crypto').ChatPresence) =>
      request<void>(`/api/chat/${encodeURIComponent(peer)}/presence`, 'PUT', token, value),
    registerPush: (tokenValue: string) =>
      request<void>('/api/push/device', 'PUT', token, { token: tokenValue }),
    unregisterPush: (tokenValue: string) =>
      request<void>('/api/push/device', 'DELETE', token, { token: tokenValue }),
    openPush: (route: string) =>
      request<{ peer: string }>('/api/push/open', 'POST', token, { route }),
    chat: () =>
      process.env.EXPO_PUBLIC_SEFIRAH_EXPERIMENTAL === 'enabled'
        ? chatApi(base, token, expoFetch, isTestingBuild)
        : null,
    /** Explicit development fallback; no route selection or automatic uploads. */
    sefirahFallback: () =>
      process.env.EXPO_PUBLIC_SEFIRAH_EXPERIMENTAL === 'enabled'
        ? sefirahFallback(base, token, expoFetch)
        : null,
    discoveryPage: (cursor = '') =>
      request<DiscoveryPage>(
        `/api/discovery/members?cursor=${encodeURIComponent(cursor)}`,
        'GET',
        token,
      ),
    grantDirectory: (grant: DirectoryGrant) =>
      request<void>('/api/discovery/grant', 'PUT', token, grant),
    handleAvailable: (directory: string, handleTag: string) =>
      request<{ available: boolean }>('/api/discovery/handle', 'PUT', token, {
        directory,
        handleTag,
      }),
    saveProfile: (profile: ProfileEnvelope) =>
      request<void>('/api/discovery/profile', 'PUT', token, profile),
    connections: () =>
      request<{ connections: ConnectionSummary[] }>('/api/discovery/connections', 'GET', token),
    connect: (peer: string, action: ConnectionAction) =>
      request<void>('/api/discovery/connections', 'PUT', token, { peer, action }),
    me: () => request<MeResponse>('/api/me', 'GET', token),
    status: () => request<StatusResponse>('/api/status', 'GET', token),
    networkSize: () => request<NetworkSizeResponse>('/api/network/size', 'GET', token),
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
    listPlaces: async (part: DirectoryPart) =>
      (await request<PlaceListResponse>(`/api/places?part=${part}`, 'GET', token)).places,
    addPlace: (place: NewPlace) => request<{ id: string }>('/api/places', 'POST', token, place),
    vouchPlace: (id: string, vouch: boolean) =>
      request<void>(`/api/places/${id}/vouch`, vouch ? 'PUT' : 'DELETE', token),
    removePlace: (id: string) => request<void>(`/api/places/${id}`, 'DELETE', token),
    listAid: async () => (await request<AidListResponse>('/api/aid', 'GET', token)).posts,
    addAid: (post: NewAidPost) => request<{ id: string }>('/api/aid', 'POST', token, post),
    replyAid: (id: string, note: string) =>
      request<void>(`/api/aid/${id}/replies`, 'POST', token, { note }),
    aidReplies: async (id: string) =>
      (await request<AidRepliesResponse>(`/api/aid/${id}/replies`, 'GET', token)).replies,
    closeAid: (id: string) => request<void>(`/api/aid/${id}/close`, 'POST', token),
    removeAid: (id: string) => request<void>(`/api/aid/${id}`, 'DELETE', token),
    listJobs: async () => (await request<JobListResponse>('/api/jobs', 'GET', token)).jobs,
    addJob: (job: NewJob) => request<{ id: string }>('/api/jobs', 'POST', token, job),
    removeJob: (id: string) => request<void>(`/api/jobs/${id}`, 'DELETE', token),
    listStories: async () =>
      (await request<StoryListResponse>('/api/stories', 'GET', token)).stories,
    addStory: (story: NewStory) => request<{ id: string }>('/api/stories', 'POST', token, story),
    thankStory: (id: string, thanks: boolean) =>
      request<void>(`/api/stories/${id}/thanks`, thanks ? 'PUT' : 'DELETE', token),
    removeStory: (id: string) => request<void>(`/api/stories/${id}`, 'DELETE', token),
    listSkills: async () => (await request<SkillListResponse>('/api/skills', 'GET', token)).skills,
    addSkill: (skill: NewSkill) => request<{ id: string }>('/api/skills', 'POST', token, skill),
    replySkill: (id: string, note: string) =>
      request<void>(`/api/skills/${id}/replies`, 'POST', token, { note }),
    skillReplies: async (id: string) =>
      (await request<AidRepliesResponse>(`/api/skills/${id}/replies`, 'GET', token)).replies,
    removeSkill: (id: string) => request<void>(`/api/skills/${id}`, 'DELETE', token),
    getJourneys: () => request<JourneyBoxResponse>('/api/journeys', 'GET', token),
    saveJourneys: (box: string, version: number) =>
      request<{ version: number }>('/api/journeys', 'PUT', token, { box, version }),
  };
}

export type Api = ReturnType<typeof authed>;
