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
import { identityFromSeed, phraseToSeed, type Identity } from '@tero/crypto';
import { signIn } from './api';
import * as vault from './vault';

export type Connection = 'connecting' | 'connected' | 'offline';

export type SessionState =
  | { status: 'loading' }
  /** No vault on this phone yet. */
  | { status: 'new' }
  | { status: 'locked' }
  | { status: 'open'; mode: 'full'; identity: Identity; connection: Connection }
  /** Opened with the decoy passcode. Holds nothing personal. */
  | { status: 'open'; mode: 'basic' };

type SessionValue = {
  state: SessionState;
  finishSetup: (phrase: string, passcode: string, decoyPasscode: string) => Promise<void>;
  unlock: (passcode: string) => Promise<vault.UnlockResult>;
  lock: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  // Each open gets a number, so a sign-in that finishes after the app locked is ignored.
  const openCount = useRef(0);

  useEffect(() => {
    vault.hasVault().then(
      (exists) => setState({ status: exists ? 'locked' : 'new' }),
      () => setState({ status: 'new' }),
    );
  }, []);

  const lock = useCallback(() => {
    openCount.current++;
    setState((s) => (s.status === 'open' ? { status: 'locked' } : s));
  }, []);

  // Lock every time the app leaves the screen. On the web this is when the tab is hidden.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') lock();
    });
    return () => sub.remove();
  }, [lock]);

  const openFull = useCallback(async (phrase: string) => {
    const identity = identityFromSeed(await phraseToSeed(phrase));
    const current = ++openCount.current;
    setState({ status: 'open', mode: 'full', identity, connection: 'connecting' });
    signIn(identity).then(
      () => current === openCount.current && setConnection('connected'),
      () => current === openCount.current && setConnection('offline'),
    );
  }, []);

  const setConnection = (connection: Connection) =>
    setState((s) => (s.status === 'open' && s.mode === 'full' ? { ...s, connection } : s));

  const finishSetup = useCallback(
    async (phrase: string, passcode: string, decoyPasscode: string) => {
      await vault.saveNewVault(phrase, passcode, decoyPasscode);
      await openFull(phrase);
    },
    [openFull],
  );

  const unlock = useCallback(
    async (passcode: string) => {
      const result = await vault.unlock(passcode);
      if (result.ok) {
        if (result.value.mode === 'full') await openFull(result.value.phrase);
        else {
          // The silent duress alert (milestone M6) will be sent from here.
          openCount.current++;
          setState({ status: 'open', mode: 'basic' });
        }
      }
      return result;
    },
    [openFull],
  );

  const value = useMemo(
    () => ({ state, finishSetup, unlock, lock }),
    [state, finishSetup, unlock, lock],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
