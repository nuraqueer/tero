import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import {
  cardCode,
  bytesToBase64Url,
  createPhrase,
  deriveSecret,
  identityFromSeed,
  phraseToSeed,
  pseudonym,
  type Identity,
} from '@tero/crypto';
import type { Role } from '@tero/protocol';
import { ApiError, authed, signIn, type Api } from './api';
import * as biometric from './biometric';
import * as vault from './vault';
import { outboxStorage } from './outbox-storage';
import { SefirahOutbox } from './sefirah-outbox';
import { NativeSefirah } from './sefirah-native';
import { SefirahPeers } from './sefirah-peers';
import { isTestingBuild } from './testing-build';
import { ChatJournal } from './chat-journal';
import { SefirahMessages } from './sefirah-mls';

/** How long Tero stays open while you're in another app or tab. */
export const awayLockMs = 30 * 60_000;

export type Connection = 'connecting' | 'connected' | 'offline';

/** A card this phone has claimed, while the newcomer sets up and waits for approval. */
export type Join = { phrase: string; cardId: string; code: string };

export type FullSession = {
  status: 'open';
  mode: 'full';
  identity: Identity;
  /** Makes the tokens of this member's Tero cards. */
  cardSecret: Uint8Array;
  /** Seals the member's journeys; never leaves the device. */
  journeySecret: Uint8Array;
  /** Development only. Opening a session never starts delivery. */
  outbox: SefirahOutbox | null;
  outboxError: boolean;
  sefirah: NativeSefirah | null;
  peers: SefirahPeers | null;
  messages: SefirahMessages | null;
  chatJournal: ChatJournal | null;
  peersError: boolean;
  connection: Connection;
  /** Null until the server has answered. */
  member: boolean | null;
  sequence: number | null;
  /** The member's tarot card (0 is the Fool). Null until known. */
  arcana: number | null;
  /** What the member may do; null until the server has answered. */
  role: Role | null;
  join: Join | null;
};

export type SessionState =
  | { status: 'loading' }
  /** No vault on this phone yet. */
  | { status: 'new'; join: Join | null }
  | { status: 'locked' }
  | FullSession
  /** Opened with the decoy passcode. Holds nothing personal. */
  | { status: 'open'; mode: 'basic' };

export type RevealResult =
  { ok: true; phrase: string } | { ok: false; waitMs: number } | { ok: false; decoy: true };

export type JoinResult = { ok: true } | { ok: false; error: ApiError['code'] };

type SessionValue = {
  state: SessionState;
  /** Claims a scanned card with new keys made on this phone. */
  startJoin: (cardToken: string) => Promise<JoinResult>;
  /** founder: claim the Fool's seat after setup (only works while Tero has no members). */
  finishSetup: (
    phrase: string,
    passcode: string,
    decoyPasscode: string,
    founder?: boolean,
  ) => Promise<void>;
  unlock: (passcode: string) => Promise<vault.UnlockResult>;
  /** Face ID or fingerprint, when the member has turned it on. */
  unlockWithBiometric: (prompt: string, cancel: string) => Promise<'opened' | 'cancelled' | 'gone'>;
  /** Turns on Face ID or fingerprint unlock; the phone confirms the owner. */
  enableBiometric: (prompt: string, cancel: string) => Promise<'on' | 'cancelled' | 'failed'>;
  /**
   * Asks for the passcode again before showing the 12 words. The decoy passcode switches
   * to the plain view, exactly as it does on the lock screen.
   */
  revealPhrase: (passcode: string) => Promise<RevealResult>;
  lock: () => void;
  /** Test installs only: removes local login keys after the person saves recovery words. */
  forgetDevice: () => Promise<void>;
  /** The signed-in API, or null while offline or locked. */
  api: () => Api | null;
  /** Asks the server again whether this key is a member. */
  refreshMember: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  // Each open gets a number, so an answer that arrives after the app locked is ignored.
  const openCount = useRef(0);
  // The seed of the open full session, so Face ID or fingerprint can be turned on
  // without typing the passcode again. Cleared on lock and in the basic view.
  const openSeed = useRef<Uint8Array | null>(null);
  // The session token lives only in memory and is dropped on lock.
  const token = useRef<string | null>(null);
  const outbox = useRef<SefirahOutbox | null>(null);
  const sefirah = useRef<NativeSefirah | null>(null);
  const peers = useRef<SefirahPeers | null>(null);
  const messages = useRef<SefirahMessages | null>(null);
  const chatJournal = useRef<ChatJournal | null>(null);

  useEffect(() => {
    vault.hasVault().then(
      (exists) => setState(exists ? { status: 'locked' } : { status: 'new', join: null }),
      () => setState({ status: 'new', join: null }),
    );
  }, []);

  const lock = useCallback(() => {
    chatJournal.current?.close();
    chatJournal.current = null;
    messages.current?.close();
    messages.current = null;
    sefirah.current?.close();
    sefirah.current = null;
    peers.current?.close();
    peers.current = null;
    outbox.current?.close();
    outbox.current = null;
    openCount.current++;
    openSeed.current = null;
    token.current = null;
    setState((s) => (s.status === 'open' ? { status: 'locked' } : s));
  }, []);

  const forgetDevice = useCallback(async () => {
    if (!isTestingBuild) throw new Error('account switching is a test tool');
    // Invalidates pending sign-ins and closes transports before removing device keys.
    lock();
    setState({ status: 'loading' });
    try {
      await biometric.forgetBiometric();
      await vault.forgetVault();
      setState({ status: 'new', join: null });
    } catch (error) {
      const exists = await vault.hasVault().catch(() => true);
      setState(exists ? { status: 'locked' } : { status: 'new', join: null });
      throw error;
    }
  }, [lock]);

  useEffect(
    () => () => {
      outbox.current?.close();
      chatJournal.current?.close();
      chatJournal.current = null;
      messages.current?.close();
      messages.current = null;
      sefirah.current?.close();
      peers.current?.close();
    },
    [],
  );

  // Lock after 30 minutes away (another app, or a hidden browser tab). Closing the app
  // or the tab locks at once: the keys only ever live in memory.
  useEffect(() => {
    let leftAt: number | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        leftAt = Date.now();
        clearTimeout(timer);
        timer = setTimeout(lock, awayLockMs);
      } else if (next === 'active') {
        clearTimeout(timer);
        // Timers may not run while the app is away, so check the clock too.
        if (leftAt !== null && Date.now() - leftAt >= awayLockMs) lock();
        leftAt = null;
      }
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [lock]);

  const updateFull = (current: number, change: Partial<FullSession>) => {
    if (current !== openCount.current) return;
    setState((s) => (s.status === 'open' && s.mode === 'full' ? { ...s, ...change } : s));
  };

  const connect = useCallback(async (identity: Identity, current: number, founder = false) => {
    try {
      const session = await signIn(identity);
      if (current !== openCount.current) return;
      token.current = session.token;
      if (founder) {
        // The seat may already be taken; then this address simply isn't the Fool.
        await authed(session.token)
          .claimFounder()
          .catch(() => undefined);
      }
      const me = await authed(session.token).me();
      updateFull(current, {
        connection: 'connected',
        member: me.member,
        sequence: me.sequence,
        arcana: me.arcana,
        role: me.role,
      });
    } catch {
      updateFull(current, { connection: 'offline' });
    }
  }, []);

  const openFull = useCallback(
    async (seed: Uint8Array, join: Join | null = null, founder = false) => {
      chatJournal.current?.close();
      chatJournal.current = null;
      messages.current?.close();
      messages.current = null;
      sefirah.current?.close();
      sefirah.current = null;
      peers.current?.close();
      peers.current = null;
      outbox.current?.close();
      outbox.current = null;
      openSeed.current = seed;
      const identity = identityFromSeed(seed);
      let outboxError = false;
      let peersError = false;
      if (process.env.EXPO_PUBLIC_SEFIRAH_EXPERIMENTAL === 'enabled') {
        const key = deriveSecret(seed, 'app', 1);
        const namespaceKey = deriveSecret(seed, 'app', 2);
        try {
          const namespace = pseudonym(
            bytesToBase64Url(namespaceKey),
            'device-outbox',
            identity.did,
          );
          outbox.current = new SefirahOutbox(outboxStorage(namespace), key);
        } catch {
          outboxError = true;
        } finally {
          key.fill(0);
          namespaceKey.fill(0);
        }
        const peerKey = deriveSecret(seed, 'app', 3);
        const peerNamespaceKey = deriveSecret(seed, 'app', 4);
        try {
          const namespace = pseudonym(
            bytesToBase64Url(peerNamespaceKey),
            'private-peers',
            identity.did,
          );
          peers.current = new SefirahPeers(outboxStorage(namespace), peerKey);
        } catch {
          peersError = true;
        } finally {
          peerKey.fill(0);
          peerNamespaceKey.fill(0);
        }
        const journalKey = deriveSecret(seed, 'app', 6);
        try {
          const namespace = pseudonym(
            bytesToBase64Url(journalKey),
            'private-chat-retries/v1',
            identity.did,
          );
          chatJournal.current = new ChatJournal(outboxStorage(namespace), journalKey);
        } catch {
          outboxError = true;
        } finally {
          journalKey.fill(0);
        }
        if (SefirahMessages.persistentAvailable) {
          const messageKey = deriveSecret(seed, 'app', 5);
          try {
            messages.current = new SefirahMessages(messageKey);
          } finally {
            messageKey.fill(0);
          }
        }
        if (NativeSefirah.available) sefirah.current = new NativeSefirah();
      }
      const current = ++openCount.current;
      token.current = null;
      setState({
        status: 'open',
        mode: 'full',
        identity,
        cardSecret: deriveSecret(seed, 'cards'),
        journeySecret: deriveSecret(seed, 'journeys'),
        outbox: outbox.current,
        outboxError,
        sefirah: sefirah.current,
        peers: peers.current,
        messages: messages.current,
        chatJournal: chatJournal.current,
        peersError,
        connection: 'connecting',
        member: null,
        sequence: null,
        arcana: null,
        role: null,
        join,
      });
      void connect(identity, current, founder);
    },
    [connect],
  );

  const startJoin = useCallback(async (cardToken: string): Promise<JoinResult> => {
    const phrase = createPhrase();
    const identity = identityFromSeed(await phraseToSeed(phrase));
    try {
      const session = await signIn(identity);
      const { id } = await authed(session.token).claimCard(cardToken);
      setState({
        status: 'new',
        join: { phrase, cardId: id, code: cardCode(id, identity.did) },
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof ApiError ? e.code : 'network' };
    }
  }, []);

  const finishSetup = useCallback(
    async (phrase: string, passcode: string, decoyPasscode: string, founder = false) => {
      const join = state.status === 'new' ? state.join : null;
      const seed = await phraseToSeed(phrase);
      // A new or restored vault: a seed kept for Face ID or fingerprint is now stale.
      await biometric.disableBiometric();
      await vault.saveNewVault(phrase, seed, passcode, decoyPasscode);
      await openFull(seed, join, founder && !join);
    },
    [openFull, state],
  );

  /** The decoy passcode was entered. The silent duress alert (milestone M6) will be sent from here. */
  const openBasic = useCallback(() => {
    chatJournal.current?.close();
    chatJournal.current = null;
    messages.current?.close();
    messages.current = null;
    sefirah.current?.close();
    sefirah.current = null;
    peers.current?.close();
    peers.current = null;
    outbox.current?.close();
    outbox.current = null;
    openCount.current++;
    openSeed.current = null;
    token.current = null;
    setState({ status: 'open', mode: 'basic' });
  }, []);

  const unlock = useCallback(
    async (passcode: string) => {
      const result = await vault.unlock(passcode);
      if (result.ok) {
        if (result.value.mode === 'full') await openFull(result.value.seed);
        else openBasic();
      }
      return result;
    },
    [openFull, openBasic],
  );

  /** Face ID or fingerprint: opens straight away, skipping the passcode stretching. */
  const unlockWithBiometric = useCallback(
    async (prompt: string, cancel: string): Promise<'opened' | 'cancelled' | 'gone'> => {
      const seed = await biometric.readBiometricSeed(prompt, cancel);
      if (seed === 'gone') return 'gone';
      if (!seed) return 'cancelled';
      await openFull(seed);
      return 'opened';
    },
    [openFull],
  );

  /** Turns Face ID or fingerprint unlock on for this phone; the phone confirms the owner. */
  const enableBiometric = useCallback(async (prompt: string, cancel: string) => {
    const seed = openSeed.current;
    return seed ? biometric.enableBiometric(seed, prompt, cancel) : ('failed' as const);
  }, []);

  const revealPhrase = useCallback(
    async (passcode: string): Promise<RevealResult> => {
      const result = await vault.unlock(passcode);
      if (!result.ok) return result;
      if (result.value.mode === 'full') return { ok: true, phrase: result.value.phrase };
      openBasic();
      return { ok: false, decoy: true };
    },
    [openBasic],
  );

  const api = useCallback(() => (token.current ? authed(token.current) : null), []);

  const refreshing = useRef(false);
  const retryDelay = useRef(3000);
  const refreshMember = useCallback(async () => {
    if (refreshing.current) return;
    const current = openCount.current;
    const seed = openSeed.current;
    if (!seed) return;
    refreshing.current = true;
    try {
      const client = api();
      if (client) {
        try {
          const me = await client.me();
          updateFull(current, {
            connection: 'connected',
            member: me.member,
            sequence: me.sequence,
            arcana: me.arcana,
            role: me.role,
          });
          return;
        } catch {
          /* An expired token or restored network requires fresh authentication. */
        }
      }
      if (current !== openCount.current || openSeed.current !== seed) return;
      updateFull(current, { connection: 'connecting' });
      const identity = identityFromSeed(seed);
      try {
        await connect(identity, current);
      } finally {
        identity.secretKey.fill(0);
      }
    } finally {
      refreshing.current = false;
    }
  }, [api, connect]);
  const fullConnection = state.status === 'open' && state.mode === 'full' ? state.connection : null;
  useEffect(() => {
    if (fullConnection === null || fullConnection === 'connecting') return;
    if (fullConnection === 'connected') retryDelay.current = 3000;
    const reconnect = () => {
      if (AppState.currentState !== 'active') return;
      retryDelay.current = Math.min(retryDelay.current * 2, 30000);
      void refreshMember();
    };
    const timer =
      fullConnection === 'offline' ? setTimeout(reconnect, retryDelay.current) : undefined;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') reconnect();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [fullConnection, refreshMember]);

  const value = useMemo(
    () => ({
      state,
      startJoin,
      finishSetup,
      unlock,
      unlockWithBiometric,
      enableBiometric,
      revealPhrase,
      lock,
      forgetDevice,
      api,
      refreshMember,
    }),
    [
      state,
      startJoin,
      finishSetup,
      unlock,
      unlockWithBiometric,
      enableBiometric,
      revealPhrase,
      lock,
      forgetDevice,
      api,
      refreshMember,
    ],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

/**
 * The open full session, for screens behind the full-mode guard. Null for the moment
 * between the app locking and the screen going away; render nothing then.
 */
export function useFullSession(): (FullSession & Omit<SessionValue, 'state'>) | null {
  const { state, ...rest } = useSession();
  if (state.status !== 'open' || state.mode !== 'full') return null;
  return { ...state, ...rest };
}
