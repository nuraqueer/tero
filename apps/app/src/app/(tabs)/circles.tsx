import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import type { ConnectionAction } from '@tero/protocol';
import { colors, fonts, radii, space } from '@tero/ui';
import { AppIcon } from '@/components/AppIcon';
import { ActiveCircles } from '@/components/ActiveCircles';
import { Button } from '@/components/Button';
import { CardAvatar } from '@/components/CardAvatar';
import { Page } from '@/components/Page';
import { TabHeader } from '@/components/TabHeader';
import { useDiscovery, type DiscoveredMember } from '@/lib/discovery';
import { compactMemberCount } from '@/lib/member-count';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';

function ContactIcon({ name }: { name: 'plus' | 'check' | 'clock' | 'close' | 'search' | 'more' }) {
  if (name === 'more') return <AppIcon name="more" size={19} color={colors.textSecondary} />;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityElementsHidden>
      {name === 'search' && (
        <Circle cx={10} cy={10} r={6} fill="none" stroke={colors.textMuted} strokeWidth={1.8} />
      )}
      <Path
        d={
          {
            plus: 'M12 5v14M5 12h14',
            check: 'm5 12 4 4 10-10',
            clock: 'M12 8v5l3 2',
            close: 'm7 7 10 10M17 7 7 17',
            search: 'm15 15 5 5',
          }[name]
        }
        fill="none"
        stroke={name === 'search' ? colors.textMuted : colors.clayText}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {name === 'clock' && (
        <Circle cx={12} cy={12} r={9} fill="none" stroke={colors.clayText} strokeWidth={1.8} />
      )}
    </Svg>
  );
}

type Section = 'spaces' | 'network' | 'contacts' | 'following';
export default function Circles() {
  const { t } = useLocale();
  const router = useRouter();
  const session = useFullSession();
  const discovery = useDiscovery();
  const { refresh } = discovery;
  const [section, setSection] = useState<Section>('network');
  const [search, setSearch] = useState('');
  const { section: selectedSection } = useLocalSearchParams<{ section?: string }>();
  const [requestFilter, setRequestFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (
        selectedSection === 'contacts' ||
        selectedSection === 'following' ||
        selectedSection === 'spaces' ||
        selectedSection === 'network'
      )
        setSection(selectedSection);
      void refresh();
    }, [refresh, selectedSection]),
  );
  const cardTitle = (member: DiscoveredMember) =>
    member.arcana === null ? t('discovery.member') : t(`arcana.${member.arcana}` as MessageKey);
  const relationship = (did: string) =>
    discovery.connections.find((connection) => connection.peer === did)?.state;
  const matches = (member: DiscoveredMember) => {
    const term = search.trim().toLocaleLowerCase().replace(/^@/, '');
    return (
      !term ||
      [member.details?.handle, member.details?.displayName, cardTitle(member)].some((value) =>
        value?.toLocaleLowerCase().includes(term),
      )
    );
  };
  const memberName = (member: DiscoveredMember) => member.details?.displayName ?? cardTitle(member);
  const members = [...discovery.members];
  if (session?.member && !members.some((member) => member.did === session.identity.did)) {
    members.push({
      did: session.identity.did,
      sequence: session.sequence ?? 9,
      arcana: session.arcana,
      details: discovery.self,
      profile: discovery.selfEnvelope,
      needsGrant: !discovery.ready,
      invalid: !!discovery.selfEnvelope && !discovery.self,
    });
  }
  const ordered = members.sort((a, b) => {
    if (a.did === session?.identity.did) return -1;
    if (b.did === session?.identity.did) return 1;
    return memberName(a).localeCompare(memberName(b));
  });
  const visible = ordered.filter(
    (member) =>
      (section === 'network' && member.did === session?.identity.did) ||
      (matches(member) &&
        (section === 'network' ||
          (section === 'contacts' &&
            member.did !== session?.identity.did &&
            relationship(member.did) === 'accepted'))),
  );
  const pendingCount = discovery.connections.filter(
    (connection) => connection.state !== 'accepted',
  ).length;
  const pending = ordered.filter(
    (member) =>
      matches(member) &&
      ['incoming', 'outgoing'].includes(relationship(member.did) ?? '') &&
      (requestFilter === 'all' || relationship(member.did) === requestFilter),
  );
  pending.sort(
    (a, b) =>
      Number(relationship(b.did) === 'incoming') - Number(relationship(a.did) === 'incoming'),
  );
  const act = async (peer: string, action: ConnectionAction) => {
    if (working) return;
    setWorking(peer);
    setError(false);
    try {
      await discovery.connect(peer, action);
    } catch {
      setError(true);
    } finally {
      setWorking(null);
    }
  };
  const renderList = (members: DiscoveredMember[]) => (
    <View style={styles.list}>
      {members.map((member, index) => {
        const initial = memberName(member).slice(0, 1).toLocaleUpperCase();
        const mine = member.did === session?.identity.did;
        const previousMember = members[index - 1];
        const previous =
          previousMember && previousMember.did !== session?.identity.did
            ? memberName(previousMember).slice(0, 1).toLocaleUpperCase()
            : null;
        return (
          <View key={member.did}>
            {!mine && initial !== previous && (
              <Text accessibilityRole="header" style={styles.letter}>
                {initial}
              </Text>
            )}
            {renderMember(member)}
          </View>
        );
      })}
    </View>
  );
  const renderMember = (member: DiscoveredMember) => {
    const state = relationship(member.did);
    const mine = member.did === session?.identity.did;
    return (
      <View key={member.did} style={styles.member}>
        <Pressable
          style={styles.identity}
          disabled={!mine && state !== 'accepted'}
          accessibilityRole={mine || state === 'accepted' ? 'button' : undefined}
          accessibilityLabel={
            mine
              ? `${memberName(member)}, ${t('tabs.you')}`
              : `${memberName(member)}, ${t('chat.title')}`
          }
          onPress={() =>
            mine
              ? router.navigate('/(tabs)/you')
              : router.push({ pathname: '/chat', params: { peer: member.did } })
          }
        >
          <CardAvatar size={32} arcana={member.arcana} />
          <View style={styles.details}>
            <Text style={styles.name}>{memberName(member)}</Text>
            <Text style={styles.handle}>
              {member.details ? `@${member.details.handle}` : `…${member.did.slice(-8)}`}
            </Text>
            {state && (
              <Text accessibilityLiveRegion="polite" style={styles.requestStatus}>
                {t(`discovery.${state}` as MessageKey)}
              </Text>
            )}
            {member.invalid && (
              <Text accessibilityRole="alert" style={styles.note}>
                {t('discovery.invalid')}
              </Text>
            )}
          </View>
        </Pressable>
        {!mine && (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t(state === 'accepted' ? 'circles.moreActions' : state === 'outgoing' ? 'discovery.cancelRequest' : state === 'incoming' ? 'discovery.accept' : 'discovery.connect')}, ${memberName(member)}`}
              accessibilityHint={state ? t(`discovery.${state}` as MessageKey) : undefined}
              accessibilityState={{
                disabled: !!working || !discovery.ready || session?.connection !== 'connected',
                busy: working === member.did,
              }}
              disabled={!!working || !discovery.ready || session?.connection !== 'connected'}
              style={({ pressed }) => [
                styles.iconButton,
                state === 'incoming' && styles.acceptButton,
                state && styles.connectedButton,
                pressed && styles.pressed,
                (!!working || !discovery.ready || session?.connection !== 'connected') &&
                  styles.disabled,
              ]}
              onPress={() => {
                if (state === 'outgoing') {
                  Alert.alert(t('discovery.cancelRequest'), memberName(member), [
                    { text: t('profile.cancel'), style: 'cancel' },
                    {
                      text: t('discovery.cancelRequest'),
                      style: 'destructive',
                      onPress: () => {
                        void act(member.did, 'remove');
                      },
                    },
                  ]);
                } else if (state === 'accepted') {
                  Alert.alert(
                    memberName(member),
                    member.details ? `@${member.details.handle}` : '',
                    [
                      {
                        text: t('circles.message'),
                        onPress: () =>
                          router.push({ pathname: '/chat', params: { peer: member.did } }),
                      },
                      {
                        text: t('discovery.remove'),
                        style: 'destructive',
                        onPress: () =>
                          Alert.alert(t('discovery.remove'), t('discovery.removeConfirm'), [
                            { text: t('profile.cancel'), style: 'cancel' },
                            {
                              text: t('discovery.remove'),
                              style: 'destructive',
                              onPress: () => {
                                void act(member.did, 'remove');
                              },
                            },
                          ]),
                      },
                      { text: t('profile.cancel'), style: 'cancel' },
                    ],
                  );
                } else {
                  void act(member.did, state === 'incoming' ? 'accept' : 'request');
                }
              }}
            >
              <View
                style={[
                  styles.iconGlyph,
                  state && styles.connectedButton,
                  state === 'incoming' && styles.acceptGlyph,
                ]}
              >
                {working === member.did ? (
                  <ActivityIndicator size="small" color={colors.clayText} />
                ) : (
                  <ContactIcon
                    name={
                      state === 'accepted'
                        ? 'more'
                        : state === 'incoming'
                          ? 'check'
                          : state === 'outgoing'
                            ? 'clock'
                            : 'plus'
                    }
                  />
                )}
                {state === 'incoming' && (
                  <Text style={styles.acceptLabel}>{t('discovery.accept')}</Text>
                )}
              </View>
            </Pressable>
            {state === 'incoming' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('discovery.decline')}, ${memberName(member)}`}
                disabled={!!working || session?.connection !== 'connected'}
                style={({ pressed }) => [
                  styles.iconButton,
                  styles.connectedButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  void act(member.did, 'remove');
                }}
              >
                <ContactIcon name="close" />
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };
  return (
    <Page tabs onRefresh={() => refresh()}>
      <TabHeader title={t('tabs.circles')} />
      <Text style={styles.intro}>{t('circles.intro')}</Text>
      {/* Live session discovery is pending; never show fabricated activity. */}
      <ActiveCircles items={[]} />
      <View accessibilityRole="tablist" style={styles.sections}>
        {(['spaces', 'network', 'contacts', 'following'] as const).map((name) => (
          <Pressable
            key={name}
            hitSlop={{ top: 5, bottom: 5 }}
            accessibilityRole="tab"
            accessibilityLabel={
              name === 'contacts' && pendingCount > 0
                ? `${t('discovery.contacts')}, ${t('discovery.pendingCount', { count: pendingCount })}`
                : undefined
            }
            accessibilityState={{ selected: section === name }}
            onPress={() => setSection(name)}
            style={({ pressed }) => [
              styles.section,
              section === name && styles.sectionSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.sectionLabel, section === name && styles.sectionLabelSelected]}>
              {t(`discovery.${name}` as MessageKey)}
            </Text>
            {name === 'contacts' && pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{compactMemberCount(pendingCount)}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
      {(section === 'network' || section === 'contacts') && (
        <View style={styles.searchField}>
          <ContactIcon name="search" />
          <TextInput
            accessibilityLabel={t('discovery.search')}
            placeholder={t('discovery.search')}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={100}
            style={styles.search}
          />
          {!!search && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.clearSearch')}
              onPress={() => setSearch('')}
              style={styles.iconButton}
            >
              <AppIcon name="close" size={15} />
            </Pressable>
          )}
        </View>
      )}
      {(discovery.error || error) && (
        <Text accessibilityRole="alert" style={styles.feedback}>
          {t('discovery.error')}
        </Text>
      )}
      {discovery.loading && (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {t('discovery.loading')}
        </Text>
      )}
      {!discovery.ready && !discovery.loading && (
        <Text style={styles.feedback}>{t('discovery.waiting')}</Text>
      )}
      {section === 'spaces' ? (
        <View style={styles.featureCard}>
          <View style={styles.featureIcon}>
            <AppIcon name="wave" color={colors.goldLight} size={28} />
          </View>
          <Text style={styles.featureTitle}>{t('circles.spacesTitle')}</Text>
          <Text style={styles.featureBody}>{t('circles.spacesDetail')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSection('network')}
            style={styles.featureLink}
          >
            <Text style={styles.featureLinkText}>{t('circles.findPeople')}</Text>
            <AppIcon name="arrow" color={colors.goldLight} size={17} />
          </Pressable>
        </View>
      ) : section === 'following' ? (
        <View>
          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <AppIcon name="shield" color={colors.goldLight} size={28} />
            </View>
            <Text style={styles.featureTitle}>{t('circles.followingTitle')}</Text>
            <Text style={styles.featureBody}>{t('circles.followingDetail')}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate('/(tabs)/help')}
              style={styles.featureLink}
            >
              <Text style={styles.featureLinkText}>{t('circles.followingResources')}</Text>
              <AppIcon name="arrow" color={colors.goldLight} size={17} />
            </Pressable>
          </View>
          <View style={styles.resources}>
            {(['mentalHealth', 'legal', 'providers'] as const).map((part) => (
              <Pressable
                key={part}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/part/[part]', params: { part } })}
                style={styles.resource}
              >
                <AppIcon
                  name={part === 'legal' ? 'shield' : 'heart'}
                  color={colors.clayText}
                  size={20}
                />
                <Text style={styles.resourceText}>{t(`part.${part}` as MessageKey)}</Text>
                <AppIcon name="arrow" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <>
          {section === 'contacts' && pendingCount > 0 && (
            <View style={styles.requestFilters}>
              {(['all', 'incoming', 'outgoing'] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: requestFilter === value }}
                  onPress={() => setRequestFilter(value)}
                  style={[styles.requestFilter, requestFilter === value && styles.requestFilterOn]}
                >
                  <Text
                    style={[
                      styles.requestFilterText,
                      requestFilter === value && styles.requestFilterTextOn,
                    ]}
                  >
                    {t(
                      value === 'all'
                        ? 'circles.requestsAll'
                        : value === 'incoming'
                          ? 'circles.requestsReceived'
                          : 'circles.requestsSent',
                    )}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {section === 'contacts' && pending.length > 0 && (
            <>
              <Text style={styles.groupLabel}>{t('discovery.requests')}</Text>
              {renderList(pending)}
              {visible.length > 0 && (
                <Text style={styles.groupLabel}>{t('discovery.contacts')}</Text>
              )}
            </>
          )}
          {visible.length
            ? renderList(visible)
            : !discovery.loading &&
              (section !== 'contacts' || pending.length === 0) && (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>
                    {t(search ? 'discovery.noResults' : 'discovery.contactsEmpty')}
                  </Text>
                  <Text style={styles.note}>{t('discovery.contactsBody')}</Text>
                </View>
              )}
          {discovery.cursor && (
            <Button
              kind="quiet"
              label={t('discovery.more')}
              disabled={discovery.loading}
              onPress={() => {
                void refresh(true);
              }}
            />
          )}
        </>
      )}
      {section === 'spaces' && (
        <View style={styles.lower}>
          <Text style={styles.groupLabel}>{t('circles.yours')}</Text>
          <Text style={styles.emptyTitle}>{t('circles.empty.title')}</Text>
          <Text style={styles.note}>{t('circles.empty.body')}</Text>
        </View>
      )}
    </Page>
  );
}
const styles = StyleSheet.create({
  intro: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginTop: -4,
    marginBottom: 20,
  },
  featureCard: {
    padding: 23,
    borderRadius: 24,
    backgroundColor: colors.slate,
    marginTop: 7,
    marginBottom: 16,
  },
  featureIcon: {
    width: 49,
    height: 49,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(230,201,168,.09)',
    marginBottom: 23,
  },
  featureTitle: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 35,
    color: colors.ivory,
    marginBottom: 10,
  },
  featureBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 21, color: '#C9C6BD' },
  featureLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    minHeight: 44,
    marginTop: 13,
  },
  featureLinkText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.goldLight },
  resources: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    paddingHorizontal: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  resource: { minHeight: 57, flexDirection: 'row', gap: 12, alignItems: 'center' },
  resourceText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate },
  requestFilters: { flexDirection: 'row', gap: 7, marginTop: 3, marginBottom: 17 },
  requestFilter: {
    paddingHorizontal: 12,
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: colors.oatLight,
  },
  requestFilterOn: { backgroundColor: colors.slate },
  requestFilterText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary },
  requestFilterTextOn: { color: colors.ivory },
  sections: {
    flexDirection: 'row',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
    marginBottom: 10,
  },
  section: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 0,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sectionSelected: { borderBottomColor: colors.clayText },
  sectionLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  sectionLabelSelected: { fontFamily: fonts.bodySemibold, color: colors.slate },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.oatLight,
    marginBottom: 12,
  },
  search: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 8,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.slate,
  },
  list: { marginBottom: 12 },
  letter: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.textSecondary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: colors.oatLight,
    borderRadius: radii.sm,
    marginTop: 4,
  },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 6,
    paddingLeft: 4,
  },
  identity: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center' },
  details: {
    flex: 1,
    gap: 2,
    paddingBottom: 6,
    marginBottom: -6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  name: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.slate },
  handle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.oatLight,
  },
  requestStatus: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.clayText,
  },
  acceptButton: { width: 'auto', minWidth: 64 },
  acceptGlyph: { width: 'auto', flexDirection: 'row', gap: 3, paddingHorizontal: 6 },
  acceptLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.clayText },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.clayText,
  },
  badgeText: { fontFamily: fonts.bodySemibold, fontSize: 9, color: colors.paper },
  connectedButton: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.4 },
  feedback: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  empty: {
    padding: space.lg,
    gap: space.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.oatLight,
    marginBottom: 12,
  },
  emptyTitle: { fontFamily: fonts.displayMedium, fontSize: 24, color: colors.slate },
  groupLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  lower: { marginTop: space.sm, gap: space.sm },
});
