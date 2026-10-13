import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts } from '@tero/ui';
import { Button } from '@/components/Button';
import { CardAvatar } from '@/components/CardAvatar';
import { EmptyState } from '@/components/EmptyState';
import { Page } from '@/components/Page';
import { TabHeader } from '@/components/TabHeader';
import { TabIcon } from '@/components/TabIcons';
import { useDiscovery } from '@/lib/discovery';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';
import { useChatActivity } from '@/lib/chat-activity';
import { useChatPresence } from '@/lib/chat-presence';

/** Accepted contacts are real; delivery and conversation indexing remain pending. */
export default function Messages() {
  const { t } = useLocale();
  const router = useRouter();
  const session = useFullSession();
  const discovery = useDiscovery();
  const { summaries } = useChatActivity();
  const presence = useChatPresence();
  const { refresh } = discovery;
  const [search, setSearch] = useState('');
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  const name = (member: { details?: { displayName: string } | null; arcana: number | null }) =>
    member.details?.displayName ??
    (member.arcana !== null ? t(`arcana.${member.arcana}` as MessageKey) : t('discovery.member'));
  const contacts = discovery.connections
    .filter(
      (connection) => connection.state === 'accepted' && connection.peer !== session?.identity.did,
    )
    .map(
      (connection) =>
        discovery.members.find((member) => member.did === connection.peer) ?? {
          did: connection.peer,
          arcana: null,
          details: null,
        },
    )
    .sort(
      (a, b) =>
        (summaries[b.did]?.latestAt ?? 0) - (summaries[a.did]?.latestAt ?? 0) ||
        name(a).localeCompare(name(b)),
    );
  const term = search.trim().toLocaleLowerCase().replace(/^@/, '');
  const visible = contacts.filter((member) =>
    [name(member), member.details?.handle, member.did].some((value) =>
      value?.toLocaleLowerCase().includes(term),
    ),
  );
  return (
    <Page tabs onRefresh={() => refresh()}>
      <TabHeader title={t('tabs.messages')} />
      <View style={styles.search}>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Circle cx={10} cy={10} r={6} stroke={colors.textMuted} strokeWidth={1.7} fill="none" />
          <Path d="m15 15 5 5" stroke={colors.textMuted} strokeWidth={1.7} strokeLinecap="round" />
        </Svg>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('discovery.search')}
          accessibilityLabel={t('discovery.search')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      {discovery.error && (
        <Text accessibilityRole="alert" style={styles.note}>
          {t('discovery.error')}
        </Text>
      )}
      {discovery.loading && !contacts.length ? (
        <ActivityIndicator style={styles.loading} color={colors.clayText} />
      ) : contacts.length ? (
        <View style={styles.list}>
          <Text style={styles.section}>{t('messages.contacts')}</Text>
          {visible.map((member) => (
            <Pressable
              key={member.did}
              accessibilityRole="button"
              accessibilityLabel={`${name(member)}, ${t('chat.title')}, ${t('messages.unread', { count: summaries[member.did]?.unread ?? 0 })}`}
              onPress={() => router.push({ pathname: '/chat', params: { peer: member.did } })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View>
                <CardAvatar size={40} arcana={member.arcana} />
                {presence.active(member.did) && (
                  <View accessibilityLabel={t('messages.activeNow')} style={styles.activeDot} />
                )}
              </View>
              <View style={styles.details}>
                <Text
                  style={[styles.name, !!summaries[member.did]?.unread && styles.unreadName]}
                  numberOfLines={1}
                >
                  {name(member)}
                </Text>
                <Text style={styles.handle} numberOfLines={1}>
                  {presence.active(member.did) ? `${t('messages.activeNow')} · ` : ''}
                  {member.details ? `@${member.details.handle}` : `…${member.did.slice(-8)}`}
                </Text>
              </View>
              {!!summaries[member.did]?.unread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {summaries[member.did]!.unread > 99 ? '99+' : summaries[member.did]!.unread}
                  </Text>
                </View>
              )}
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path
                  d="m9 5 7 7-7 7"
                  fill="none"
                  stroke={colors.textMuted}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          ))}
          {!visible.length && <Text style={styles.note}>{t('discovery.noResults')}</Text>}
        </View>
      ) : (
        <View style={styles.empty}>
          <EmptyState
            icon={<TabIcon name="messages" color={colors.clayText} />}
            title={t('messages.empty.title')}
            body={t('discovery.contactsBody')}
          />
          <Button
            label={t('messages.find')}
            kind="secondary"
            onPress={() => router.navigate('/(tabs)/circles')}
          />
        </View>
      )}
    </Page>
  );
}
const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: colors.oatLight,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.slate,
  },
  list: { gap: 0 },
  section: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  details: { flex: 1, gap: 3 },
  activeDot: {
    position: 'absolute',
    right: -1,
    bottom: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#5D8769',
    borderWidth: 2,
    borderColor: colors.ivory,
  },
  name: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.slate },
  unreadName: { fontFamily: fonts.bodySemibold },
  unreadBadge: {
    minWidth: 23,
    height: 23,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.clayText,
  },
  unreadText: { fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.ivory },
  handle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  note: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginVertical: 12,
  },
  empty: { gap: 20 },
  loading: { marginVertical: 30 },
  pressed: { opacity: 0.6 },
});
