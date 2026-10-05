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
  createPhrase,
  deriveSecret,
  identityFromSeed,
  phraseToSeed,
  type Identity,
} from '@tero/crypto';
import type { Role } from '@tero/protocol';
import { ApiError, authed, signIn, type Api } from './api';
import * as biometric from './biometric';
import * as vault from './vault';

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

export type BiometricResult =
  | { ok: true }
  | { ok: false; waitMs: number }
  | { ok: false; decoy: true }
  | { ok: false; failed: true };

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
  unlockWithBiometric: (prompt: string) => Promise<'opened' | 'cancelled' | 'gone'>;
  /** Turns on Face ID or fingerprint unlock after checking the passcode. */
  enableBiometric: (passcode: string, prompt: string) => Promise<BiometricResult>;
  /**
   * Asks for the passcode again before showing the 12 words. The decoy passcode switches
   * to the plain view, exactly as it does on the lock screen.
   */
  revealPhrase: (passcode: string) => Promise<RevealResult>;
  lock: () => void;
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
  // The session token lives only in memory and is dropped on lock.
  const token = useRef<string | null>(null);

  useEffect(() => {
    vault.hasVault().then(
      (exists) => setState(exists ? { status: 'locked' } : { status: 'new', join: null }),
      () => setState({ status: 'new', join: null }),
    );
  }, []);

  const lock = useCallback(() => {
    openCount.current++;
    token.current = null;
    setState((s) => (s.status === 'open' ? { status: 'locked' } : s));
  }, []);

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
      const identity = identityFromSeed(seed);
      const current = ++openCount.current;
      token.current = null;
      setState({
        status: 'open',
        mode: 'full',
        identity,
        cardSecret: deriveSecret(seed, 'cards'),
        journeySecret: deriveSecret(seed, 'journeys'),
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
    openCount.current++;
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
    async (prompt: string): Promise<'opened' | 'cancelled' | 'gone'> => {
      const seed = await biometric.readBiometricSeed(prompt);
      if (seed === 'gone') return 'gone';
      if (!seed) return 'cancelled';
      await openFull(seed);
      return 'opened';
    },
    [openFull],
  );

  /** Turns biometric unlock on after checking the passcode. The decoy switches to basic. */
  const enableBiometric = useCallback(
    async (passcode: string, prompt: string): Promise<BiometricResult> => {
      const result = await vault.unlock(passcode);
      if (!result.ok) return result;
      if (result.value.mode !== 'full') {
        openBasic();
        return { ok: false, decoy: true };
      }
      return (await biometric.enableBiometric(result.value.seed, prompt))
        ? { ok: true }
        : { ok: false, failed: true };
    },
    [openBasic],
  );

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

  const refreshMember = useCallback(async () => {
    const current = openCount.current;
    const client = api();
    if (!client) return;
    try {
      const me = await client.me();
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
  }, [api]);

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
