import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { AreaIcon, areas } from '@/components/AreaIcon';
import { CardMark } from '@/components/CardMark';
import { LanguageMenu } from '@/components/LanguageMenu';
import { Wordmark } from '@/components/Wordmark';
import { guides } from '@/guides';
import { useLocale } from '@/lib/locale';

const wide = 1080;

/**
 * tero.pherus.org: a calm, plain page about a queer resource platform. One light ground,
 * dark text, and the warm accent only for links. Nothing on it names a member or a card.
 */
export function PublicHome({ onFounder }: { onFounder: () => void }) {
  const { t } = useLocale();

  const button = (label: string, onPress: () => void, primary = false) => (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
      ]}
    >
      <Text style={primary ? styles.primaryText : styles.secondaryText}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
      {/* The header stays at the top while the page scrolls. */}
      <View style={styles.bar}>
        <View style={[styles.wrap, styles.header]}>
          {/* The founder's hidden setup: a long press on the mark (only while the seat is open). */}
          <Pressable onLongPress={onFounder} delayLongPress={1500} style={styles.brand}>
            <CardMark height={28} />
            <Wordmark height={16} />
          </Pressable>
          <View style={styles.nav}>
            <Text style={styles.navLink} onPress={() => router.push('/guides')}>
              {t('public.nav.guides')}
            </Text>
            <LanguageMenu />
          </View>
        </View>
      </View>

      <View style={[styles.wrap, styles.hero]}>
        <Text style={styles.h1} accessibilityRole="header">
          {t('public.title')}
        </Text>
        <Text style={styles.lead}>{t('public.lead')}</Text>
        <View style={styles.buttons}>
          {button(t('welcome.haveCard'), () => router.push('/scan'), true)}
          {button(t('public.readGuides'), () => router.push('/guides'))}
        </View>
        <Text style={styles.small} onPress={() => router.push('/restore')}>
          {t('welcome.restore')}
        </Text>
        <View style={styles.facts}>
          {(
            [
              'public.fact.q2q',
              'public.fact.noName',
              'public.fact.e2e',
              'public.fact.open',
            ] as MessageKey[]
          ).map((key) => (
            <Text key={key} style={styles.fact}>
              {t(key)}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.rule} />

      {/* What members find. */}
      <View style={[styles.wrap, styles.section]}>
        <Text style={styles.h2} accessibilityRole="header">
          {t('public.areas.title')}
        </Text>
        <View style={styles.grid}>
          {areas.map((area) => (
            <View key={area} style={styles.tile}>
              <AreaIcon area={area} size={24} color={colors.slate} />
              <Text style={styles.h3}>{t(`area.${area}` as MessageKey)}</Text>
              <Text style={styles.body}>{t(`public.area.${area}` as MessageKey)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Open guides. */}
      <View style={[styles.wrap, styles.section]}>
        <Text style={styles.h2} accessibilityRole="header">
          {t('public.guides.title')}
        </Text>
        <Text style={styles.sub}>{t('public.guides.note')}</Text>
        <View style={styles.list}>
          {guides.map((guide, i) => (
            <Pressable
              key={guide.slug}
              accessibilityRole="link"
              onPress={() =>
                router.push({ pathname: '/guides/[slug]', params: { slug: guide.slug } })
              }
              style={({ pressed }) => [
                styles.row,
                i > 0 && styles.divider,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={styles.rowText}>
                <Text style={styles.h3}>{t(`guide.${guide.key}.title` as MessageKey)}</Text>
                <Text style={styles.body}>{t(`guide.${guide.key}.summary` as MessageKey)}</Text>
              </View>
              <Text style={styles.rowMeta}>
                {guide.text ? t('public.guides.read') : t('guides.writing')}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* How it stays trustworthy, and how joining works. */}
      <View style={[styles.wrap, styles.section]}>
        <Text style={styles.h2} accessibilityRole="header">
          {t('public.join.title')}
        </Text>
        <View style={styles.grid}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={styles.step}>
              <Text style={styles.stepNumber}>{n}</Text>
              <Text style={styles.h3}>{t(`public.join.${n}.title` as MessageKey)}</Text>
              <Text style={styles.body}>{t(`public.join.${n}.body` as MessageKey)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.wrap, styles.section]}>
        <View style={styles.note}>
          <View style={styles.noteText}>
            <Text style={styles.h3}>{t('public.partners.title')}</Text>
            <Text style={styles.body}>{t('public.partners.body')}</Text>
          </View>
        </View>
        <View style={styles.note}>
          <View style={styles.noteText}>
            <Text style={styles.h3}>{t('public.safety.title')}</Text>
            <Text style={styles.body}>{t('public.safety.body')}</Text>
          </View>
          {button(t('public.safety.read'), () =>
            router.push({ pathname: '/guides/[slug]', params: { slug: 'staying-safe-online' } }),
          )}
        </View>
      </View>

      <View style={styles.rule} />
      <View style={[styles.wrap, styles.footer]}>
        <Text style={styles.footerText}>{t('public.footer.by')}</Text>
        <Text
          style={styles.footerText}
          onPress={() => Linking.openURL('https://github.com/phe-rus/tero')}
        >
          {t('public.footer.source')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.ivory },
  wrap: { width: '100%', maxWidth: wide, alignSelf: 'center', paddingHorizontal: space.lg },
  pressed: { opacity: 0.8 },
  bar: {
    backgroundColor: colors.ivory,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm + 4,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  nav: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  navLink: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.slate },
  hero: { paddingTop: space.xl * 2, paddingBottom: space.xl, maxWidth: 820 },
  h1: {
    fontFamily: fonts.display,
    fontSize: 46,
    lineHeight: 54,
    color: colors.slate,
    alignSelf: 'flex-start',
  },
  lead: {
    fontFamily: fonts.body,
    fontSize: 18,
    lineHeight: 28,
    color: colors.textSecondary,
    marginTop: space.md,
  },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.lg },
  button: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.slate },
  secondary: { borderWidth: 1, borderColor: 'rgba(31,30,29,0.2)' },
  primaryText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ivory },
  secondaryText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.slate },
  small: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.clayText,
    marginTop: space.md,
    alignSelf: 'flex-start',
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: space.lg,
    rowGap: space.sm,
    marginTop: space.xl,
  },
  fact: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    width: '100%',
    maxWidth: wide,
    alignSelf: 'center',
  },
  section: { paddingVertical: space.xl },
  h2: { fontFamily: fonts.display, fontSize: 30, color: colors.slate },
  sub: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  h3: { fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.slate },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.lg },
  tile: {
    flexGrow: 1,
    flexBasis: 220,
    gap: space.sm,
    padding: space.lg,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  list: {
    marginTop: space.lg,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  rowPressed: { backgroundColor: colors.oatLight },
  rowText: { flex: 1, gap: 4 },
  rowMeta: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.clayText },
  step: { flexGrow: 1, flexBasis: 240, gap: space.sm },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(31,30,29,0.25)',
    textAlign: 'center',
    lineHeight: 28,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.slate,
  },
  note: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  noteText: { flexGrow: 1, flexBasis: 320, gap: space.sm },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.lg,
  },
  footerText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
});
