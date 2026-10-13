import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { bytesToBase64Url, signChatPresence, verifyChatPresence } from '@tero/crypto';
import { useFullSession } from './session';

type Presence = {
  visible: boolean;
  setVisible: (visible: boolean) => Promise<void>;
  active: (peer: string) => boolean;
};
const Context = createContext<Presence | null>(null);
export function ChatPresenceProvider({ children }: { children: ReactNode }) {
  const session = useFullSession();
  const identity = session?.identity;
  const api = session?.api;
  const admitted = session?.member === true && session.connection === 'connected';
  const [visible, setVisibleState] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [peers, setPeers] = useState<Record<string, number>>({});
  const [clock, setClock] = useState(() => Date.now());
  const accepted = useRef<string[]>([]);
  const key = identity ? `tero.presence.${bytesToBase64Url(identity.publicKey)}` : '';
  useEffect(() => {
    let live = true;
    void SecureStore.getItemAsync(key)
      .then((value) => {
        if (live) {
          setVisibleState(value !== 'hidden');
          setLoaded(true);
        }
      })
      .catch(() => {
        if (live) {
          setVisibleState(false);
          setLoaded(true);
        }
      });
    return () => {
      live = false;
    };
  }, [key]);
  useEffect(() => {
    if (!identity || !admitted || !loaded) return;
    let live = true;
    let busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastRoster = 0;
    const pulse = async () => {
      if (!live || busy || AppState.currentState !== 'active') return;
      busy = true;
      try {
        const client = api?.();
        if (!client) return;
        if (Date.now() - lastRoster > 60_000) {
          const result = await client.connections();
          if (!live || AppState.currentState !== 'active') return;
          accepted.current = result.connections
            .filter((v) => v.state === 'accepted')
            .map((v) => v.peer);
          lastRoster = Date.now();
        }
        const result: Record<string, number> = {};
        // Batches limit outstanding requests even for a large accepted list.
        for (let i = 0; i < accepted.current.length; i += 4) {
          if (!live || AppState.currentState !== 'active') return;
          await Promise.allSettled(
            accepted.current.slice(i, i + 4).map(async (peer) => {
              await client.setChatPresence(peer, signChatPresence(identity, peer, visible));
              if (!live || AppState.currentState !== 'active') return;
              const { presence } = await client.chatPresence(peer);
              if (verifyChatPresence(presence, peer, identity.did) && presence.active)
                result[peer] = presence.expiresAt;
            }),
          );
        }
        if (live && AppState.currentState === 'active') {
          setPeers(result);
          setClock(Date.now());
        }
      } catch {
        if (live) setClock(Date.now());
      } finally {
        busy = false;
        if (live && AppState.currentState === 'active')
          timer = setTimeout(() => void pulse(), 20_000);
      }
    };
    const hide = () => {
      const client = api?.();
      if (client)
        for (const peer of accepted.current) {
          try {
            void client
              .setChatPresence(peer, signChatPresence(identity, peer, false))
              .catch(() => {});
          } catch {
            /* The session may already have wiped its identity on lock. */
          }
        }
    };
    void pulse();
    const clockTimer = setInterval(() => setClock(Date.now()), 5000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void pulse();
      else {
        clearTimeout(timer);
        hide();
        setPeers({});
      }
    });
    return () => {
      live = false;
      clearTimeout(timer);
      clearInterval(clockTimer);
      listener.remove();
      hide();
    };
  }, [identity, admitted, api, visible, loaded]);
  const setVisible = async (value: boolean) => {
    await SecureStore.setItemAsync(key, value ? 'visible' : 'hidden');
    setVisibleState(value);
  };
  return (
    <Context value={{ visible, setVisible, active: (peer) => (peers[peer] ?? 0) > clock }}>
      {children}
    </Context>
  );
}
export function useChatPresence() {
  const presence = useContext(Context);
  if (!presence) throw new Error('Presence requires an unlocked session');
  return presence;
}
