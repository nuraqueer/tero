import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts } from '@tero/ui';
import { AppIcon, type AppIconName } from '@/components/AppIcon';
import { RoundButton } from '@/components/ScreenHeader';
import { Page } from '@/components/Page';
import { TabHeader } from '@/components/TabHeader';
import { useDiscovery } from '@/lib/discovery';
import { useLocale } from '@/lib/locale';
import { useHelpOverview } from '@/lib/use-help-overview';
import { communityUpdates } from '@/lib/help-activity';
type Filter = 'all' | 'aid' | 'jobs' | 'skills' | 'stories';
const icons: Record<Exclude<Filter, 'all'>, AppIconName> = {
  aid: 'heart',
  jobs: 'briefcase',
  skills: 'book',
  stories: 'spark',
};
export default function Gathering() {
  const { t } = useLocale();
  const discovery = useDiscovery();
  const overview = useHelpOverview();
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(24);
  const requests = discovery.connections.filter((v) => v.state === 'incoming').length;
  const matching = communityUpdates(overview).filter((v) => filter === 'all' || v.part === filter);
  const updates = matching.slice(0, limit);
  const unavailable =
    filter === 'all'
      ? overview.aid === null &&
        overview.jobs === null &&
        overview.skills === null &&
        overview.stories === null
      : overview[filter] === null;
  return (
    <Page tabs onRefresh={overview.refresh}>
      <TabHeader
        title={t('tabs.gathering')}
        right={
          <RoundButton label={t('compose.title')} onPress={() => router.push('/compose')}>
            <AppIcon name="plus" size={21} />
          </RoundButton>
        }
      />
      <Text style={styles.intro}>
        {discovery.self?.displayName
          ? t('gathering.welcome', { name: discovery.self.displayName })
          : t('gathering.welcomeGeneric')}
      </Text>
      {requests > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.navigate({ pathname: '/(tabs)/circles', params: { section: 'contacts' } })
          }
          style={({ pressed }) => [styles.request, pressed && styles.pressed]}
        >
          <AppIcon name="people" color={colors.clayText} />
          <Text style={styles.requestText}>{t('gathering.requests', { count: requests })}</Text>
          <AppIcon name="arrow" size={17} />
        </Pressable>
      )}
      <View style={styles.homeCard}>
        <View style={styles.homeHeading}>
          <AppIcon name="people" color={colors.goldLight} size={25} />
          <Text style={styles.homeLabel}>{t('gathering.fromCircles')}</Text>
        </View>
        <Text style={styles.homeTitle}>{t('gathering.circlesTitle')}</Text>
        <Text style={styles.homeBody}>{t('gathering.circlesBody')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/(tabs)/circles')}
          style={styles.homeLink}
        >
          <Text style={styles.homeLinkText}>{t('gathering.findPeople')}</Text>
          <AppIcon name="arrow" size={16} color={colors.goldLight} />
        </Pressable>
      </View>
      <View style={styles.quickRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: '/part/[part]', params: { part: 'aid', create: 'request' } })
          }
          style={styles.quick}
        >
          <AppIcon name="heart" color={colors.clayText} size={18} />
          <Text style={styles.quickText}>{t('aid.request')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: '/part/[part]', params: { part: 'aid', create: 'offer' } })
          }
          style={styles.quick}
        >
          <AppIcon name="plus" color={colors.clayText} size={18} />
          <Text style={styles.quickText}>{t('aid.offer')}</Text>
        </Pressable>
      </View>
      <Text accessibilityRole="header" style={styles.section}>
        {t('gathering.community')}
      </Text>
      <Text style={styles.body}>{t('gathering.communityBody')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {(['all', 'aid', 'jobs', 'skills', 'stories'] as const).map((name) => (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === name }}
            onPress={() => {
              setFilter(name);
              setLimit(24);
            }}
            style={[styles.filter, filter === name && styles.filterOn]}
          >
            <Text style={[styles.filterText, filter === name && styles.filterTextOn]}>
              {t(name === 'all' ? 'gathering.all' : (`part.${name}` as MessageKey))}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {overview.error && (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {t('help.refreshError')}
        </Text>
      )}
      {updates.length ? (
        <View style={styles.feed}>
          {updates.map((item) => (
            <Pressable
              key={`${item.part}/${item.id}`}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/part/[part]',
                  params: { part: item.part, focus: item.id },
                })
              }
              style={({ pressed }) => [styles.post, pressed && styles.pressed]}
            >
              <View style={styles.postTop}>
                <View style={styles.postIcon}>
                  <AppIcon name={icons[item.part]} size={18} color={colors.clayText} />
                </View>
                <Text style={styles.category}>{t(`part.${item.part}` as MessageKey)}</Text>
                <AppIcon name="arrow" size={16} color={colors.textMuted} />
              </View>
              <Text style={styles.postTitle}>{item.title}</Text>
              {!!item.preview && (
                <Text style={styles.preview} numberOfLines={3}>
                  {item.preview}
                </Text>
              )}
              {!!item.warning && (
                <Text style={styles.warning}>
                  {t('gathering.contentNote', { note: item.warning })}
                </Text>
              )}
              <Text style={styles.postLink}>
                {item.mine ? `${t('dir.yours')} · ` : ''}
                {t('gathering.openBoard')}
              </Text>
            </Pressable>
          ))}
          {matching.length > limit ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setLimit((v) => v + 24)}
              style={styles.more}
            >
              <Text style={styles.linkText}>{t('common.showMore')}</Text>
              <AppIcon name="plus" size={16} color={colors.clayText} />
            </Pressable>
          ) : (
            <Text style={styles.end}>{t('gathering.caughtUp')}</Text>
          )}
        </View>
      ) : (
        <View style={styles.empty}>
          <AppIcon
            name={filter === 'all' ? 'spark' : icons[filter]}
            size={30}
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>
            {t(
              overview.loading
                ? 'gathering.loading'
                : unavailable
                  ? 'gathering.offline'
                  : 'gathering.noUpdates',
            )}
          </Text>
          <Text style={styles.emptyBody}>
            {t(unavailable ? 'gathering.offlineBody' : 'gathering.noUpdatesBody')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/(tabs)/help')}
            style={styles.emptyLink}
          >
            <Text style={styles.linkText}>{t('gathering.openHelp')}</Text>
            <AppIcon name="arrow" size={16} color={colors.clayText} />
          </Pressable>
        </View>
      )}
    </Page>
  );
}
const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  intro: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginTop: -4,
    marginBottom: 23,
  },
  request: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.oatLight,
    padding: 14,
    borderRadius: 15,
    marginBottom: 15,
  },
  requestText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate },
  homeCard: { padding: 23, borderRadius: 25, backgroundColor: colors.slate },
  homeHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 21 },
  homeLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.goldLight },
  homeTitle: {
    fontFamily: fonts.display,
    fontSize: 29,
    lineHeight: 34,
    color: colors.ivory,
    marginBottom: 8,
  },
  homeBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: '#C9C6BD' },
  homeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    paddingTop: 18,
    paddingBottom: 2,
    minHeight: 44,
  },
  homeLinkText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.goldLight },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 13, marginBottom: 29 },
  quick: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.oatLight,
  },
  quickText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate },
  section: { fontFamily: fonts.display, fontSize: 27, color: colors.slate, marginBottom: 5 },
  body: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  filters: { gap: 8, paddingTop: 16, paddingBottom: 18 },
  filter: {
    paddingHorizontal: 15,
    minHeight: 39,
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  filterOn: { backgroundColor: colors.slate, borderColor: colors.slate },
  filterText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  filterTextOn: { color: colors.ivory },
  feed: { gap: 12 },
  post: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  postTop: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 },
  postIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.oatLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  category: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary },
  postTitle: { fontFamily: fonts.bodySemibold, fontSize: 17, lineHeight: 24, color: colors.slate },
  preview: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginTop: 8,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    minHeight: 48,
  },
  end: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 18,
  },
  postLink: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 13 },
  warning: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.clayText,
    marginTop: 10,
  },
  feedback: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  empty: { paddingVertical: 35, alignItems: 'center', gap: 12 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.slate, textAlign: 'center' },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyLink: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  linkText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.clayText },
});
