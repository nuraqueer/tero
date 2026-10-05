import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { directoryParts } from '@tero/protocol';
import { colors, fonts, radii, space } from '@tero/ui';
import { Page } from '@/components/Page';
import { TabHeader } from '@/components/TabHeader';
import { useLocale } from '@/lib/locale';

const part = (name: string, create?: string): Href =>
  create === undefined
    ? { pathname: '/part/[part]', params: { part: name } }
    : { pathname: '/part/[part]', params: { part: name, create } };

/** Everything a member can start from Help, in one place. */
const createOptions: Array<{ label: MessageKey; href: Href | 'place' }> = [
  { label: 'aid.request', href: part('aid', 'request') },
  { label: 'aid.offer', href: part('aid', 'offer') },
  { label: 'dir.submit', href: 'place' },
  { label: 'jobs.post', href: part('jobs', '1') },
  { label: 'stories.share', href: part('stories', '1') },
  { label: 'help.create.skill', href: part('skills', '1') },
  { label: 'journeys.start', href: part('journeys', '1') },
];

/** The cards: every part that isn't a place directory. */
const cards: Array<{ title: MessageKey; body: MessageKey; href: Href; strong?: boolean }> = [
  { title: 'help.crisis.title', body: 'help.crisis.body', href: '/crisis', strong: true },
  { title: 'help.map.title', body: 'help.map.body', href: '/map' },
  { title: 'part.aid', body: 'help.card.aid', href: part('aid') },
  { title: 'part.jobs', body: 'help.card.jobs', href: part('jobs') },
  { title: 'part.journeys', body: 'help.card.journeys', href: part('journeys') },
  { title: 'part.stories', body: 'help.card.stories', href: part('stories') },
  { title: 'part.skills', body: 'help.card.skills', href: part('skills') },
  { title: 'part.listen', body: 'help.card.listen', href: part('listen') },
  { title: 'part.showCard', body: 'help.card.showCard', href: part('showCard') },
  { title: 'part.communities', body: 'help.card.communities', href: part('communities') },
  { title: 'part.fundraisers', body: 'help.card.fundraisers', href: part('fundraisers') },
];

/** Help: one place to share or ask, cards for each kind of help, and places by type. */
export default function Help() {
  const { t } = useLocale();
  const [creating, setCreating] = useState(false);
  const [choosingPlace, setChoosingPlace] = useState(false);

  return (
    <Page tabs>
      <TabHeader title={t('tabs.help')} />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: creating }}
        onPress={() => {
          setCreating((v) => !v);
          setChoosingPlace(false);
        }}
        style={({ pressed }) => [styles.create, pressed && styles.pressed]}
      >
        <Text style={styles.createPlus}>{creating ? '×' : '+'}</Text>
        <Text style={styles.createText}>{t('help.create')}</Text>
      </Pressable>
      {creating && (
        <View style={styles.sheet}>
          {choosingPlace ? (
            <>
              <Text style={styles.sheetLabel}>{t('help.create.placeKind')}</Text>
              <View style={styles.chips}>
                {directoryParts.map((p) => (
                  <Pressable
                    key={p}
                    accessibilityRole="button"
                    onPress={() => router.push(part(p, '1'))}
                    style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                  >
                    <Text style={styles.chipText}>{t(`part.${p}` as MessageKey)}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.chips}>
              {createOptions.map((o) => (
                <Pressable
                  key={o.label}
                  accessibilityRole="button"
                  onPress={() =>
                    o.href === 'place' ? setChoosingPlace(true) : router.push(o.href)
                  }
                  style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                >
                  <Text style={styles.chipText}>{t(o.label)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.grid}>
        {cards.map((c) => (
          <Pressable
            key={c.title}
            accessibilityRole="button"
            onPress={() => router.push(c.href)}
            style={({ pressed }) => [
              styles.card,
              c.strong && styles.cardStrong,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.cardTitle, c.strong && styles.cardTitleStrong]}>{t(c.title)}</Text>
            <Text style={[styles.cardBody, c.strong && styles.cardBodyStrong]}>{t(c.body)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section} accessibilityRole="header">
        {t('help.places')}
      </Text>
      <Text style={styles.sectionBody}>{t('help.placesBody')}</Text>
      <View style={styles.chips}>
        {directoryParts.map((p) => (
          <Pressable
            key={p}
            accessibilityRole="button"
            onPress={() => router.push(part(p))}
            style={({ pressed }) => [styles.place, pressed && styles.pressed]}
          >
            <Text style={styles.placeText}>{t(`part.${p}` as MessageKey)}</Text>
          </Pressable>
        ))}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 52,
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
    backgroundColor: colors.slate,
  },
  createPlus: { fontFamily: fonts.body, fontSize: 24, lineHeight: 26, color: colors.ivory },
  createText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.ivory },
  sheet: {
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radii.lg,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  sheetLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.oatLight,
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm + 4, marginTop: space.lg },
  card: {
    flexBasis: '46%',
    flexGrow: 1,
    gap: 2,
    padding: space.md,
    minHeight: 92,
    borderRadius: radii.lg,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  cardStrong: { backgroundColor: colors.slate, borderColor: colors.slate },
  cardTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.slate },
  cardTitleStrong: { color: colors.ivory },
  cardBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  cardBodyStrong: { color: '#C9C6BD' },
  section: { fontFamily: fonts.display, fontSize: 22, color: colors.slate, marginTop: space.xl },
  sectionBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 2,
  },
  place: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(31,30,29,0.15)',
  },
  placeText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate },
});
