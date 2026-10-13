import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts } from '@tero/ui';
import { Button } from '@/components/Button';
import { CardAvatar } from '@/components/CardAvatar';
import { InputBar } from '@/components/InputBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useDiscovery } from '@/lib/discovery';
import { useLocale } from '@/lib/locale';
import { useConversation } from '@/lib/use-conversation';
import type { ChatItem } from '@/lib/sefirah-mls';
import { bottomControlOffset } from '@/lib/bottom-clearance';
import { useChatPresence } from '@/lib/chat-presence';

const visibility = { itemVisiblePercentThreshold: 20, minimumViewTime: 700 };

export default function Chat() {
  const { peer } = useLocalSearchParams<{ peer?: string | string[] }>();
  const did = typeof peer === 'string' ? peer : '';
  return <Conversation key={did} peer={did} />;
}
function Conversation({ peer }: { peer: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const discovery = useDiscovery();
  const presence = useChatPresence();
  const conversation = useConversation(peer);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const refreshGeneration = useRef(0);
  const list = useRef<FlatList<ChatItem>>(null);
  const nearBottom = useRef(true);
  const [atLatest, setAtLatest] = useState(true);
  const unreadHere = conversation.items.filter(
    (item) => !item.outgoing && item.readAt === 0,
  ).length;
  useEffect(() => {
    let frame: ReturnType<typeof requestAnimationFrame> | undefined;
    const shown = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      nearBottom.current = true;
      setAtLatest(true);
      frame = requestAnimationFrame(() => list.current?.scrollToEnd({ animated: true }));
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      shown.remove();
      hidden.remove();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, []);
  const read = useRef(conversation.read);
  useEffect(() => {
    read.current = conversation.read;
  }, [conversation.read]);
  const visible = useCallback(({ viewableItems }: { viewableItems: ViewToken<ChatItem>[] }) => {
    if (AppState.currentState !== 'active') return;
    const ids = viewableItems
      .filter((v) => v.isViewable && !v.item.outgoing && v.item.readAt === 0)
      .map((v) => v.item.id);
    if (ids.length) void read.current(ids).catch(() => {});
  }, []);
  useFocusEffect(
    useCallback(() => {
      refreshGeneration.current++;
      setRefreshing(false);
      setRefreshError(false);
      return () => {
        refreshGeneration.current++;
        setRefreshing(false);
        setDraft('');
        setSendError(false);
      };
    }, []),
  );
  const refresh = async () => {
    if (refreshing) return;
    const generation = ++refreshGeneration.current;
    setRefreshing(true);
    setRefreshError(false);
    const finish = () => {
      if (generation === refreshGeneration.current) setRefreshing(false);
    };
    const timer = setTimeout(finish, 12_000);
    try {
      await conversation.refresh();
    } catch {
      if (generation === refreshGeneration.current) setRefreshError(true);
    } finally {
      clearTimeout(timer);
      finish();
    }
  };
  const member = discovery.members.find((v) => v.did === peer);
  const name =
    member?.details?.displayName ??
    (member?.arcana != null ? t(`arcana.${member.arcana}` as MessageKey) : t('chat.title'));
  const handle = member?.details ? `@${member.details.handle}` : peer ? `…${peer.slice(-8)}` : '';
  const permitted = conversation.phase === 'open' || conversation.phase === 'preview';
  const status: MessageKey =
    conversation.phase === 'preview'
      ? 'chat.previewOnly'
      : conversation.problem
        ? 'chat.connectionWaiting'
        : !conversation.ready
          ? 'chat.securing'
          : conversation.route === 'mixed'
            ? 'chat.routeMixed'
            : conversation.route === 'sefirah'
              ? 'chat.routePrivate'
              : conversation.route === 'cloudflare'
                ? 'chat.routeFallback'
                : 'chat.routeWaiting';
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <ScreenHeader
            title={name}
            sub={presence.active(peer) ? `${t('messages.activeNow')} · ${handle}` : handle}
            right={<CardAvatar size={32} arcana={member?.arcana} />}
          />
        </View>
        <Text style={[styles.retention, { paddingVertical: 10 }]}>{t('chat.retention')}</Text>
        {conversation.phase === 'loading' ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.clayText} />
            <Text style={styles.body}>{t('chat.checking')}</Text>
          </View>
        ) : !permitted ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('chat.title')}</Text>
            <Text style={styles.body}>
              {t(conversation.phase === 'denied' ? 'chat.access' : 'chat.openError')}
            </Text>
            <Button
              kind="secondary"
              label={t(conversation.phase === 'denied' ? 'messages.find' : 'chat.retry')}
              onPress={() =>
                conversation.phase === 'denied'
                  ? router.navigate('/(tabs)/circles')
                  : conversation.retry()
              }
            />
          </View>
        ) : (
          <FlatList<ChatItem>
            ref={list}
            style={styles.thread}
            contentContainerStyle={styles.content}
            data={conversation.items}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={visible}
            viewabilityConfig={visibility}
            onScroll={({ nativeEvent: event }) => {
              nearBottom.current =
                event.contentSize.height - event.layoutMeasurement.height - event.contentOffset.y <
                80;
              setAtLatest(nearBottom.current);
            }}
            scrollEventThrottle={32}
            onContentSizeChange={() => {
              if (nearBottom.current) list.current?.scrollToEnd({ animated: false });
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void refresh()}
                tintColor={colors.textMuted}
                colors={[colors.textMuted]}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <CardAvatar size={54} arcana={member?.arcana} />
                <Text style={styles.emptyTitle}>{t('chat.empty')}</Text>
                <Text style={styles.body}>{t('chat.emptyBody')}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={[styles.incoming, { marginVertical: 4 }, item.outgoing && styles.outgoing]}
              >
                <Text selectable style={[styles.message, item.outgoing && styles.outgoingText]}>
                  {item.text}
                </Text>
                {item.sentAt > 0 && (
                  <Text style={[styles.receipt, item.outgoing && styles.outgoingReceipt]}>
                    {new Date(item.sentAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {item.outgoing
                      ? ` · ${t(item.peerReadAt > 0 ? 'chat.read' : item.deliveredAt > 0 ? 'chat.delivered' : 'chat.queued')}`
                      : ''}
                  </Text>
                )}
              </View>
            )}
          />
        )}
        <View
          style={[
            styles.composer,
            { paddingBottom: keyboardVisible ? 10 : bottomControlOffset(insets.bottom) },
          ]}
        >
          {permitted && (
            <Text accessibilityLiveRegion="polite" style={styles.availability}>
              {t(status)}
            </Text>
          )}
          {!atLatest && unreadHere > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                nearBottom.current = true;
                setAtLatest(true);
                list.current?.scrollToEnd({ animated: true });
              }}
              style={styles.newMessages}
            >
              <Text style={styles.newMessagesText}>
                {t('messages.unread', { count: unreadHere })} ↓
              </Text>
            </Pressable>
          )}
          <InputBar
            placeholder={t('chat.message')}
            value={draft}
            onChangeText={(v) => {
              setDraft(v);
              setSendError(false);
            }}
            editable={permitted}
            sending={sending}
            sendLabel={t('chat.send')}
            onSend={
              conversation.ready && !sending
                ? () => {
                    const text = draft.trim();
                    if (!text) return;
                    setSending(true);
                    setSendError(false);
                    void conversation
                      .send(text)
                      .then(() => setDraft((current) => (current === draft ? '' : current)))
                      .catch(() => setSendError(true))
                      .finally(() => setSending(false));
                  }
                : undefined
            }
          />
          {sendError && (
            <Text accessibilityLiveRegion="polite" style={styles.draft}>
              {t('chat.sendError')}
            </Text>
          )}
          {refreshError && (
            <Text accessibilityLiveRegion="polite" style={styles.draft}>
              {t('chat.refreshError')}
            </Text>
          )}
          {conversation.problem && (
            <Button kind="secondary" label={t('chat.retry')} onPress={conversation.retry} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  outgoing: { alignSelf: 'flex-end', backgroundColor: colors.slate },
  outgoingText: { color: colors.ivory },
  receipt: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, marginTop: 5 },
  outgoingReceipt: { color: '#C9C6BD' },
  safe: { flex: 1, backgroundColor: colors.ivory },
  keyboard: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  thread: { flex: 1 },
  content: { flexGrow: 1, padding: 20, paddingBottom: 24 },
  retention: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    color: colors.textMuted,
    paddingHorizontal: 16,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  emptyTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 25,
    color: colors.slate,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  bubbles: { gap: 8, paddingTop: 24 },
  incoming: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    backgroundColor: colors.oatLight,
    borderRadius: 19,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  message: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.slate },
  composer: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
    backgroundColor: colors.ivory,
  },
  newMessages: {
    alignSelf: 'center',
    paddingHorizontal: 15,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.slate,
  },
  newMessagesText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ivory },
  availability: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  draft: {
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
