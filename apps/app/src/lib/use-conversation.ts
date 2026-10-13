import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ChatAccessError, requireAcceptedContact } from './chat-access';
import { useFullSession } from './session';
import { SefirahMessages, type ChatItem } from './sefirah-mls';
import { ChatDelivery, type ChatRoute } from './chat-delivery';
import { useChatActivity } from './chat-activity';
import { useDiscovery } from './discovery';

type ConversationState = {
  phase: 'loading' | 'open' | 'preview' | 'denied' | 'error';
  items: ChatItem[];
  ready: boolean;
  route: ChatRoute;
  problem: boolean;
};
const empty = {
  items: [] as ChatItem[],
  ready: false,
  route: 'connecting' as ChatRoute,
  problem: false,
};
/** Only a freshly accepted contact can open state. Delivery pauses on blur/background. */
export function useConversation(peer: string) {
  const session = useFullSession();
  const { update } = useChatActivity();
  const senderName = useDiscovery().self?.displayName;
  const api = session?.api;
  const identity = session?.identity;
  const owner = session?.messages;
  const journal = session?.chatJournal;
  const node = session?.sefirah;
  const connection = session?.connection;
  const reload = useRef<() => Promise<void>>(async () => {});
  const delivery = useRef<ChatDelivery | null>(null);
  const [state, setState] = useState<ConversationState>({ phase: 'loading', ...empty });
  useFocusEffect(
    useCallback(() => {
      let live = true;
      let generation = 0;
      let opening: AbortController | null = null;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      let chat: ReturnType<NonNullable<typeof owner>['create']> | null = null;
      const stop = () => {
        clearTimeout(timeout);
        generation++;
        opening?.abort();
        opening = null;
        delivery.current?.close();
        delivery.current = null;
        chat?.close();
        chat = null;
      };
      const load = async () => {
        stop();
        const current = generation;
        const controller = new AbortController();
        opening = controller;
        setState({ phase: 'loading', ...empty });
        timeout = setTimeout(() => {
          if (!live || current !== generation) return;
          stop();
          setState({ phase: 'error', ...empty });
        }, 15_000);
        try {
          const client = api?.();
          if (!client || !identity || connection !== 'connected')
            throw new Error('Session unavailable');
          await requireAcceptedContact(client, identity.did, peer);
          if (!live || current !== generation) return;
          if (!owner) {
            setState({ phase: 'preview', ...empty });
            return;
          }
          const opened = SefirahMessages.asyncAvailable
            ? await owner.createAsync(identity, peer, controller.signal)
            : owner.create(identity, peer);
          if (!live || current !== generation) {
            opened.close();
            return;
          }
          chat = opened;
          if (SefirahMessages.deliveryAvailable && journal) {
            const transport = new ChatDelivery(
              identity,
              peer,
              client,
              opened,
              journal,
              node ?? null,
              (view) => {
                if (live && current === generation) {
                  update(peer, view.items);
                  setState({ phase: 'open', ...view });
                }
              },
              () => {
                if (live && current === generation) setState({ phase: 'denied', ...empty });
              },
              senderName,
            );
            delivery.current = transport;
            await transport.start();
          } else {
            // Older binaries retain their read-only diagnostic inbox until updated.
            const saved = SefirahMessages.asyncAvailable
              ? await opened.receivedAsync()
              : opened.received();
            if (!live || current !== generation) return;
            const items: ChatItem[] = saved.map((v) => ({
              ...v,
              outgoing: false,
              sentAt: 0,
              deliveredAt: 0,
              readAt: 0,
              peerReadAt: 0,
              expiresAt: 0,
              wireId: v.id,
            }));
            setState({ phase: 'preview', ...empty, items });
          }
        } catch (error) {
          if (!live || current !== generation) return;
          stop();
          setState({ phase: error instanceof ChatAccessError ? 'denied' : 'error', ...empty });
        } finally {
          if (current === generation) clearTimeout(timeout);
        }
      };
      void load();
      reload.current = load;
      const subscription = AppState.addEventListener('change', (next) => {
        if (next === 'active') void load();
        else {
          stop();
          setState({ phase: 'loading', ...empty });
        }
      });
      return () => {
        live = false;
        reload.current = async () => {};
        subscription.remove();
        stop();
      };
    }, [api, identity, owner, journal, node, peer, connection, update, senderName]),
  );
  return {
    ...state,
    read: (ids: string[]) => delivery.current?.read(ids) ?? Promise.resolve(),
    retry: () => reload.current(),
    refresh: () => delivery.current?.sync() ?? reload.current(),
    send: (text: string) => {
      const transport = delivery.current;
      if (!transport || !state.ready) return Promise.reject(new Error('Chat is not ready'));
      return transport.send(text);
    },
  };
}
