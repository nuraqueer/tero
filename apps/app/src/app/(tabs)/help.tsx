import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@tero/i18n';
import { directoryParts } from '@tero/protocol';
import { colors, fonts, radii } from '@tero/ui';
import { AppIcon, type AppIconName } from '@/components/AppIcon';
import { Page } from '@/components/Page';
import { TabHeader } from '@/components/TabHeader';
import { HelpActivity } from '@/components/HelpActivity';
import { useLocale } from '@/lib/locale';
import { useHelpOverview } from '@/lib/use-help-overview';
const part = (name: string, create?: string): Href => ({
  pathname: '/part/[part]',
  params: { part: name, ...(create ? { create } : {}) },
});
const createOptions: { label: MessageKey; icon: AppIconName; href: Href | 'place' }[] = [
  { label: 'aid.request', icon: 'heart', href: part('aid', 'request') },
  { label: 'aid.offer', icon: 'people', href: part('aid', 'offer') },
  { label: 'dir.submit', icon: 'pin', href: 'place' },
  { label: 'jobs.post', icon: 'briefcase', href: part('jobs', '1') },
  { label: 'stories.share', icon: 'spark', href: part('stories', '1') },
  { label: 'help.create.skill', icon: 'book', href: part('skills', '1') },
  { label: 'journeys.start', icon: 'arrow', href: part('journeys', '1') },
];
const cards: {
  title: MessageKey;
  body: MessageKey;
  icon: AppIconName;
  part: string;
  count?: 'aid' | 'jobs' | 'stories' | 'skills';
}[] = [
  { title: 'part.aid', body: 'help.card.aid', icon: 'heart', part: 'aid', count: 'aid' },
  { title: 'part.jobs', body: 'help.card.jobs', icon: 'briefcase', part: 'jobs', count: 'jobs' },
  { title: 'part.journeys', body: 'help.card.journeys', icon: 'arrow', part: 'journeys' },
  { title: 'part.skills', body: 'help.card.skills', icon: 'book', part: 'skills', count: 'skills' },
  {
    title: 'part.stories',
    body: 'help.card.stories',
    icon: 'spark',
    part: 'stories',
    count: 'stories',
  },
  { title: 'part.listen', body: 'help.card.listen', icon: 'chat', part: 'listen' },
  { title: 'part.communities', body: 'help.card.communities', icon: 'people', part: 'communities' },
  { title: 'part.fundraisers', body: 'help.card.fundraisers', icon: 'heart', part: 'fundraisers' },
];
export default function Help() {
  const { t } = useLocale();
  const overview = useHelpOverview();
  const inset = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [choosingPlace, setChoosingPlace] = useState(false);
  useFocusEffect(
    useCallback(
      () => () => {
        setCreating(false);
        setChoosingPlace(false);
      },
      [],
    ),
  );
  const term = search.trim().toLocaleLowerCase();
  const matches = (...values: string[]) =>
    !term || values.some((v) => v.toLocaleLowerCase().includes(term));
  const visible = cards.filter((c) => matches(t(c.title), t(c.body)));
  const places = directoryParts.filter((p) => matches(t(`part.${p}` as MessageKey)));
  const open = (href: Href) => {
    setCreating(false);
    setChoosingPlace(false);
    router.push(href);
  };
  return (
    <>
      <Page tabs onRefresh={overview.refresh}>
        <TabHeader title={t('tabs.help')} />
        <Text style={styles.intro}>{t('help.intro')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setCreating(true);
            setChoosingPlace(false);
          }}
          style={({ pressed }) => [styles.create, pressed && styles.pressed]}
        >
          <View style={styles.createIcon}>
            <AppIcon name="plus" color={colors.ivory} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.createTitle}>{t('help.create')}</Text>
            <Text style={styles.createBody}>{t('help.createHint')}</Text>
          </View>
          <AppIcon name="arrow" size={19} color={colors.goldLight} />
        </Pressable>
        <View style={styles.searchRow}>
          <AppIcon name="search" size={19} color={colors.textMuted} />
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel={t('help.search')}
            placeholder={t('help.search')}
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            maxLength={100}
          />
          {!!search && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.clearSearch')}
              onPress={() => setSearch('')}
              style={styles.clear}
            >
              <AppIcon name="close" size={15} />
            </Pressable>
          )}
        </View>
        {!term && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/crisis')}
            style={({ pressed }) => [styles.crisis, pressed && styles.pressed]}
          >
            <View style={styles.crisisIcon}>
              <AppIcon name="shield" color={colors.clayText} size={25} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.crisisTitle}>{t('help.crisis.title')}</Text>
              <Text style={styles.body}>{t('help.crisis.body')}</Text>
            </View>
            <AppIcon name="arrow" size={17} color={colors.textSecondary} />
          </Pressable>
        )}
        {overview.error && (
          <Text accessibilityLiveRegion="polite" style={styles.feedback}>
            {t('help.refreshError')}
          </Text>
        )}
        <View style={styles.grid}>
          {visible.map((c) => {
            const count =
              c.count === 'aid'
                ? overview.aid?.filter((post) => post.open).length
                : c.count
                  ? overview[c.count]?.length
                  : undefined;
            return (
              <Pressable
                key={c.part}
                accessibilityRole="button"
                onPress={() => router.push(part(c.part))}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.cardTop}>
                  <AppIcon name={c.icon} color={colors.clayText} size={18} />
                  <Text style={styles.compactTitle} numberOfLines={2}>
                    {t(c.title)}
                  </Text>
                </View>
                <Text style={styles.cardBody} numberOfLines={2}>
                  {t(c.body)}
                </Text>
                {count !== undefined && (
                  <Text style={styles.count}>{t('help.available', { count })}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
        {!term && <HelpActivity overview={overview} />}
        {places.length > 0 && (
          <>
            <Text accessibilityRole="header" style={styles.section}>
              {t('help.places')}
            </Text>
            <Text style={styles.body}>{t('help.placesBody')}</Text>
            <View style={styles.chips}>
              {places.map((p) => (
                <Pressable
                  key={p}
                  accessibilityRole="button"
                  onPress={() => router.push(part(p))}
                  style={({ pressed }) => [styles.place, pressed && styles.pressed]}
                >
                  <AppIcon name="pin" size={16} color={colors.textSecondary} />
                  <Text style={styles.placeText}>{t(`part.${p}` as MessageKey)}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {!visible.length && !places.length && (
          <View style={styles.empty}>
            <AppIcon name="search" size={30} color={colors.textMuted} />
            <Text style={styles.cardTitle}>{t('discovery.noResults')}</Text>
            <Text style={styles.body}>{t('help.searchEmpty')}</Text>
          </View>
        )}
      </Page>
      <Modal
        visible={creating}
        transparent
        animationType="slide"
        onRequestClose={() => setCreating(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={t('profile.cancel')}
            onPress={() => setCreating(false)}
          />
          <View
            accessibilityViewIsModal
            style={[styles.sheet, { paddingBottom: Math.max(inset.bottom, 16) + 12 }]}
          >
            <View style={styles.handle} />
            <View style={styles.sheetHeading}>
              <Text accessibilityRole="header" style={styles.sheetTitle}>
                {t(choosingPlace ? 'help.create.placeKind' : 'help.create')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('profile.cancel')}
                onPress={() => setCreating(false)}
                style={styles.clear}
              >
                <AppIcon name="close" size={19} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {choosingPlace ? (
                <>
                  <Pressable
                    onPress={() => setChoosingPlace(false)}
                    accessibilityRole="button"
                    style={styles.back}
                  >
                    <Text style={styles.backText}>{t('help.allWays')}</Text>
                  </Pressable>
                  {directoryParts.map((p) => (
                    <Pressable
                      key={p}
                      accessibilityRole="button"
                      onPress={() => open(part(p, '1'))}
                      style={styles.option}
                    >
                      <AppIcon name="pin" color={colors.clayText} />
                      <Text style={styles.optionText}>{t(`part.${p}` as MessageKey)}</Text>
                      <AppIcon name="arrow" size={17} />
                    </Pressable>
                  ))}
                </>
              ) : (
                createOptions.map((o) => (
                  <Pressable
                    key={o.label}
                    accessibilityRole="button"
                    onPress={() => (o.href === 'place' ? setChoosingPlace(true) : open(o.href))}
                    style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                  >
                    <AppIcon name={o.icon} color={colors.clayText} />
                    <Text style={styles.optionText}>{t(o.label)}</Text>
                    <AppIcon name="arrow" size={17} color={colors.textMuted} />
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  intro: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginTop: -5,
    marginBottom: 22,
  },
  create: {
    backgroundColor: colors.slate,
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  createIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(230,201,168,.12)',
  },
  createTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.ivory },
  createBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.goldLight,
    marginTop: 3,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.oatLight,
    borderRadius: 15,
    paddingLeft: 14,
    marginTop: 20,
    marginBottom: 18,
    minHeight: 46,
  },
  search: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.slate,
    paddingVertical: 12,
  },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  crisis: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 16,
    backgroundColor: '#EEE7DA',
    borderRadius: 20,
    marginBottom: 18,
  },
  crisisIcon: { width: 36, alignItems: 'center' },
  crisisTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.slate,
    marginBottom: 3,
  },
  body: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    flexBasis: '46%',
    flexGrow: 1,
    padding: 13,
    borderRadius: 16,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    minHeight: 108,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 9,
    marginBottom: 8,
  },
  cardTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.slate, marginBottom: 5 },
  count: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.clayText, marginTop: 7 },
  compactTitle: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.slate,
  },
  cardBody: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  section: {
    fontFamily: fonts.display,
    fontSize: 25,
    color: colors.slate,
    marginTop: 28,
    marginBottom: 5,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  place: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  placeText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate },
  feedback: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginBottom: 14 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,20,19,.38)' },
  sheet: {
    backgroundColor: colors.ivory,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    maxHeight: '82%',
  },
  handle: {
    width: 35,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.oat,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  sheetHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.slate, flex: 1 },
  option: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  optionText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.slate },
  back: { paddingVertical: 12 },
  backText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.clayText },
});
