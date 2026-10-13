import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@tero/ui';
import type { ChatItem } from './sefirah-mls';
import { useDiscovery } from './discovery';
import { useLocale } from './locale';
import { AppIcon } from '@/components/AppIcon';

type Summary = { unread: number; latestAt: number };
type Activity = {
  summaries: Record<string, Summary>;
  total: number;
  activePeer: string | null;
  update: (peer: string, items: ChatItem[]) => void;
};
const Context = createContext<Activity | null>(null);

/** Derived from authenticated native history. No plaintext preview or second read-state database. */
export function ChatActivityProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ peer?: string }>();
  const activePeer = pathname === '/chat' && typeof params.peer === 'string' ? params.peer : null;
  const active = useRef(activePeer);
  const known = useRef(new Map<string, Set<string>>());
  const live = useRef(true);
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [notice, setNotice] = useState<{ peer: string; at: number } | null>(null);
  const discovery = useDiscovery();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    active.current = activePeer;
  }, [activePeer]);
  useEffect(() => {
    live.current = true;
    const seen = known.current;
    const listener = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setNotice(null);
    });
    return () => {
      live.current = false;
      seen.clear();
      listener.remove();
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const update = useCallback((peer: string, items: ChatItem[]) => {
    if (!live.current) return;
    const now = Date.now();
    const current = items.filter((v) => v.expiresAt > now);
    const unread = current.filter((v) => !v.outgoing && v.readAt === 0);
    const previous = known.current.get(peer);
    const incoming = current.filter((v) => !v.outgoing);
    const arrived = previous && unread.some((v) => !previous.has(v.id));
    known.current.set(peer, new Set(incoming.map((v) => v.id)));
    const latestAt = current.reduce((at, v) => Math.max(at, v.sentAt), 0);
    setSummaries((old) =>
      old[peer]?.unread === unread.length && old[peer]?.latestAt === latestAt
        ? old
        : { ...old, [peer]: { unread: unread.length, latestAt } },
    );
    if (arrived && active.current !== peer && AppState.currentState === 'active')
      setNotice({ peer, at: now });
  }, []);
  const accepted = new Set(
    discovery.connections.filter((v) => v.state === 'accepted').map((v) => v.peer),
  );
  const visible = Object.fromEntries(
    Object.entries(summaries).filter(([peer]) => accepted.has(peer)),
  );
  const total = Object.values(visible).reduce((count, v) => count + v.unread, 0);
  const member = notice && discovery.members.find((v) => v.did === notice.peer);
  return (
    <Context value={{ summaries: visible, total, activePeer, update }}>
      {children}
      {notice && accepted.has(notice.peer) && activePeer !== notice.peer && (
        <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 8 }]}>
          <View style={styles.banner} accessibilityLiveRegion="polite">
            <Pressable
              accessibilityRole="button"
              style={styles.open}
              onPress={() => {
                const peer = notice.peer;
                setNotice(null);
                router.push({ pathname: '/chat', params: { peer } });
              }}
            >
              <AppIcon name="chat" color={colors.goldLight} />
              <View style={styles.words}>
                <Text style={styles.title}>
                  {member?.details?.displayName ?? t('messages.newMessage')}
                </Text>
                <Text style={styles.body}>{t('messages.newMessage')}</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('profile.cancel')}
              onPress={() => setNotice(null)}
              style={styles.close}
            >
              <AppIcon name="close" size={16} color={colors.ivory} />
            </Pressable>
          </View>
        </View>
      )}
    </Context>
  );
}
export function useChatActivity() {
  const activity = useContext(Context);
  if (!activity) throw new Error('Chat activity requires an unlocked session');
  return activity;
}
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    maxWidth: 520,
    alignSelf: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  words: { flex: 1, gap: 3 },
  title: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ivory },
  body: { fontFamily: fonts.body, fontSize: 12, color: colors.goldLight },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
