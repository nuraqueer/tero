import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useChatActivity } from './chat-activity';
import { useFullSession } from './session';
import { SefirahMessages } from './sefirah-mls';
import { ChatDelivery } from './chat-delivery';
import { useDiscovery } from './discovery';

/** Prepare accepted conversations while unlocked and foregrounded, one at a time.
 * The visible chat owns its engine exclusively; idle work skips that peer.
 */
export function ChatPreparation({ children }: { children: ReactNode }) {
  const session = useFullSession();
  const api = session?.api;
  const identity = session?.identity;
  const messages = session?.messages;
  const journal = session?.chatJournal;
  const admitted = session?.member === true && session.connection === 'connected';
  const { activePeer, update } = useChatActivity();
  const senderName = useDiscovery().self?.displayName;
  useEffect(() => {
    if (
      !admitted ||
      !api ||
      !identity ||
      !messages ||
      !journal ||
      !SefirahMessages.asyncAvailable ||
      !SefirahMessages.deliveryAvailable
    )
      return;
    let live = true;
    let running = false;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let opening: AbortController | null = null;
    let transport: ChatDelivery | null = null;
    let peers: string[] = [];
    let lastRoster = 0;
    let nextPeer = 0;
    const stop = () => {
      generation++;
      clearTimeout(timer);
      opening?.abort();
      transport?.close();
      transport = null;
    };
    const prepare = async () => {
      if (!live || running || AppState.currentState !== 'active') return;
      running = true;
      const current = generation;
      const client = api();
      try {
        if (!client) return;
        if (Date.now() - lastRoster >= 30_000) {
          const result = await client.connections();
          if (!live || current !== generation || AppState.currentState !== 'active') return;
          peers = result.connections
            .filter((v) => v.state === 'accepted' && v.peer !== identity.did)
            .map((v) => v.peer)
            .sort();
          lastRoster = Date.now();
        }
        if (!peers.length || current !== generation) return;
        const candidates = peers.filter((v) => v !== activePeer);
        if (!candidates.length) return;
        const peer = candidates[nextPeer++ % candidates.length]!;
        const controller = new AbortController();
        opening = controller;
        const chat = await messages.createAsync(identity, peer, controller.signal);
        if (!live || controller.signal.aborted || AppState.currentState !== 'active') {
          chat.close();
          return;
        }
        // Idle preparation uses the encrypted fallback. It does not bootstrap a
        // new Tor node for each contact or mark incoming messages read.
        const driver = new ChatDelivery(
          identity,
          peer,
          client,
          chat,
          journal,
          null,
          (view) => {
            if (live && !controller.signal.aborted) update(peer, view.items);
          },
          () => {},
          senderName,
        );
        transport = driver;
        const deadline = setTimeout(() => {
          controller.abort();
          driver.close();
        }, 30_000);
        try {
          await driver.start(false);
          await driver.sync();
        } finally {
          clearTimeout(deadline);
          driver.close();
          if (transport === driver) transport = null;
        }
      } catch {
        // Normal chat surfaces report errors. Idle preparation retries quietly.
      } finally {
        opening?.abort();
        opening = null;
        running = false;
        if (live && AppState.currentState === 'active')
          timer = setTimeout(() => void prepare(), 5000);
      }
    };
    void prepare();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void prepare();
      else stop();
    });
    return () => {
      live = false;
      stop();
      subscription.remove();
    };
  }, [admitted, activePeer, api, identity, messages, journal, update, senderName]);
  return children;
}
