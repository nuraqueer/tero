import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as SecureStore from 'expo-secure-store';
import { bytesToBase64Url, publicKeyFromDid } from '@tero/crypto';
import { useFullSession } from './session';
import { useChatActivity } from './chat-activity';

type Status = 'off' | 'enabling' | 'enabled' | 'denied' | 'update' | 'error';
type Settings = { status: Status; enable: () => Promise<void>; disable: () => Promise<void> };
const Context = createContext<Settings | null>(null);
let native: Promise<typeof import('expo-notifications') | null> | undefined;
let handledResponse: string | undefined;
let unlocked = false;
function sdk() {
  if (!native)
    native =
      Platform.OS === 'web' || !requireOptionalNativeModule('ExpoNotificationPermissionsModule')
        ? Promise.resolve(null)
        : import('expo-notifications');
  return native;
}

/** Opt-in alerts can show sender names; message text and routing DIDs stay private. */
export function MessageNotifications({ children }: { children: ReactNode }) {
  const session = useFullSession();
  const identity = session?.identity;
  const api = session?.api;
  const admitted = session?.member === true && session.connection === 'connected';
  const { total } = useChatActivity();
  const [status, setStatus] = useState<Status>('off');
  const token = useRef<string | null>(null);
  const owner = useRef(0);
  const busy = useRef(false);
  const key = identity ? `tero.notifications.${bytesToBase64Url(identity.publicKey)}` : '';
  useEffect(() => {
    if (!admitted) return;
    unlocked = true;
    const current = ++owner.current;
    let subscription: { remove: () => void } | undefined;
    void sdk()
      .then(async (notifications) => {
        if (!notifications || current !== owner.current) return;
        notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner:
              Platform.OS === 'android' || !unlocked || AppState.currentState !== 'active',
            shouldShowList: true,
            shouldPlaySound:
              Platform.OS === 'android' || !unlocked || AppState.currentState !== 'active',
            shouldSetBadge: false,
          }),
        });
        const open = (response: import('expo-notifications').NotificationResponse | null) => {
          if (
            !response ||
            current !== owner.current ||
            response.notification.request.content.data?.kind !== 'chat'
          )
            return;
          const id = response.notification.request.identifier;
          if (handledResponse === id) return;
          handledResponse = id;
          const route = response.notification.request.content.data?.route;
          if (typeof route !== 'string' || route.length > 1600) {
            router.navigate('/(tabs)/messages');
            return;
          }
          void (async () => {
            try {
              const client = api?.();
              if (!client) throw new Error('Notification session unavailable');
              const target = await client.openPush(route);
              if (current !== owner.current) return;
              if (!publicKeyFromDid(target.peer)) throw new Error('Invalid notification target');
              router.navigate({ pathname: '/chat', params: { peer: target.peer } });
            } catch {
              if (current === owner.current) router.navigate('/(tabs)/messages');
            }
          })();
        };
        subscription = notifications.addNotificationResponseReceivedListener(open);
        open(notifications.getLastNotificationResponse());
      })
      .catch(() => {});
    return () => {
      unlocked = false;
      owner.current = current + 1;
      subscription?.remove();
    };
  }, [admitted, api]);
  useEffect(() => {
    void sdk()
      .then((n) => n?.setBadgeCountAsync(total))
      .catch(() => {});
  }, [total]);

  const register = async (request: boolean) => {
    if (busy.current || !admitted || !key) return;
    const client = api?.();
    if (!client) return;
    busy.current = true;
    const current = owner.current;
    setStatus('enabling');
    try {
      const notifications = await sdk();
      if (!notifications) {
        setStatus('update');
        return;
      }
      if (Platform.OS === 'android')
        await notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: notifications.AndroidImportance.HIGH,
          lockscreenVisibility: notifications.AndroidNotificationVisibility.PRIVATE,
        });
      let permission = await notifications.getPermissionsAsync();
      if (request && !permission.granted)
        permission = await notifications.requestPermissionsAsync();
      const allowed =
        permission.granted ||
        permission.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL;
      if (!allowed) {
        if (current === owner.current) {
          setStatus('denied');
          await SecureStore.setItemAsync(key, 'off');
        }
        return;
      }
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) throw new Error('Notification project unavailable');
      const result = await notifications.getExpoPushTokenAsync({ projectId });
      if (current !== owner.current) return;
      await client.registerPush(result.data);
      if (current !== owner.current) return;
      token.current = result.data;
      await SecureStore.setItemAsync(key, result.data);
      setStatus('enabled');
    } catch {
      if (current === owner.current) setStatus('error');
    } finally {
      busy.current = false;
    }
  };
  const registerRef = useRef(register);
  useEffect(() => {
    registerRef.current = register;
  });
  useEffect(() => {
    let live = true;
    const restore = async () => {
      if (!admitted || !key || Platform.OS === 'web') return;
      const saved = await SecureStore.getItemAsync(key).catch(() => null);
      if (!live || saved === 'off') return;
      if (!saved) {
        await registerRef.current(true);
        return;
      }
      token.current = saved;
      await registerRef.current(false);
    };
    void restore();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void restore();
    });
    return () => {
      live = false;
      listener.remove();
    };
  }, [admitted, key]);
  const disable = async () => {
    const client = api?.();
    if (!client || !token.current || busy.current) return;
    busy.current = true;
    try {
      await client.unregisterPush(token.current);
      await SecureStore.setItemAsync(key, 'off');
      token.current = null;
      setStatus('off');
    } catch {
      setStatus('error');
    } finally {
      busy.current = false;
    }
  };
  return <Context value={{ status, enable: () => register(true), disable }}>{children}</Context>;
}
export function useMessageNotifications() {
  const settings = useContext(Context);
  if (!settings) throw new Error('Notification settings require an unlocked session');
  return settings;
}
