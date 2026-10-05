import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { locales, localeNames, type MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { CardMark } from '@/components/CardMark';
import { MemberCard } from '@/components/MemberCard';
import { AreaIcon, areas } from '@/components/AreaIcon';
import { Wordmark } from '@/components/Wordmark';
import { guides } from '@/guides';
import { useLocale } from '@/lib/locale';

const wide = 1080;

/** tero.pherus.org: what Tero is, the open guides, partners and how joining works. */
export function PublicHome({ onFounder }: { onFounder: () => void }) {
  const { t, locale, setLocale } = useLocale();

  const linkButton = (label: string, onPress: () => void, primary = false) => (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        primary ? styles.ctaPrimary : styles.ctaSecondary,
        pressed && styles.pressed,
      ]}
    >
      <Text style={primary ? styles.ctaPrimaryText : styles.ctaSecondaryText}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      {/* Hero, on the dark ground of the cards. */}
      <View style={styles.hero}>
        <View style={styles.wrap}>
          <View style={styles.header}>
            {/* The founder's hidden setup: a long press on the mark (only while the seat is open). */}
            <Pressable onLongPress={onFounder} delayLongPress={1500} style={styles.brand}>
              <CardMark height={34} />
              <Wordmark height={18} color={colors.oatLight} />
            </Pressable>
            <View style={styles.nav}>
              <Text style={styles.navLink} onPress={() => router.push('/guides')}>
                {t('public.nav.guides')}
              </Text>
              <View style={styles.langs} accessibilityRole="radiogroup">
                {locales.map((code) => (
                  <Text
                    key={code}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: code === locale }}
                    onPress={() => setLocale(code)}
                    style={[styles.lang, code === locale && styles.langOn]}
                  >
                    {localeNames[code]}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.heroBody}>
            <View style={styles.heroText}>
              <Text style={styles.kicker}>{t('public.kicker')}</Text>
              <Text style={styles.h1} accessibilityRole="header">
                {t('app.tagline')}
              </Text>
              <Text style={styles.lead}>{t('public.lead')}</Text>
              <View style={styles.ctas}>
                {linkButton(t('welcome.haveCard'), () => router.push('/scan'), true)}
                {linkButton(t('public.readGuides'), () => router.push('/guides'))}
              </View>
              <Text style={styles.restore} onPress={() => router.push('/restore')}>
                {t('welcome.restore')}
              </Text>
            </View>
            <View style={styles.heroCard} accessibilityElementsHidden>
              <MemberCard arcana={0} sequence={null} width={230} />
            </View>
          </View>
        </View>
        <View style={styles.facts}>
          <View style={[styles.wrap, styles.factsRow]}>
            {(
              [
                'public.fact.languages',
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
      </View>

      {/* The four areas of help. */}
      <View style={[styles.wrap, styles.section]}>
        <Text style={styles.h2} accessibilityRole="header">
          {t('public.areas.title')}
        </Text>
        <View style={styles.grid}>
          {areas.map((area) => (
            <View key={area} style={styles.area}>
              <View style={styles.areaIcon}>
                <AreaIcon area={area} size={26} color={colors.clayText} />
              </View>
              <Text style={styles.areaName}>{t(`area.${area}` as MessageKey)}</Text>
              <Text style={styles.body}>{t(`public.area.${area}` as MessageKey)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Open guides. */}
      <View style={[styles.wrap, styles.section]}>
        <View style={styles.sectionHead}>
          <Text style={styles.h2} accessibilityRole="header">
            {t('public.guides.title')}
          </Text>
          <Text style={styles.note}>{t('public.guides.note')}</Text>
        </View>
        <View style={styles.grid}>
          {guides.map((guide) => (
            <Pressable
              key={guide.slug}
              accessibilityRole="link"
              onPress={() =>
                router.push({ pathname: '/guides/[slug]', params: { slug: guide.slug } })
              }
              style={({ pressed }) => [styles.guide, pressed && styles.pressed]}
            >
              <Text style={styles.guideArea}>
                {t(`area.${guide.area}` as MessageKey).toUpperCase()}
                {guide.text ? '' : ` · ${t('guides.writing').toUpperCase()}`}
              </Text>
              <Text style={styles.guideTitle}>{t(`guide.${guide.key}.title` as MessageKey)}</Text>
              <Text style={styles.body}>{t(`guide.${guide.key}.summary` as MessageKey)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Partners. */}
      <View style={styles.partners}>
        <View style={[styles.wrap, styles.partnersRow]}>
          <View style={styles.partnersText}>
            <Text style={styles.kicker}>{t('public.partners.kicker')}</Text>
            <Text style={[styles.h2, styles.light]} accessibilityRole="header">
              {t('public.partners.title')}
            </Text>
            <Text style={[styles.body, styles.lightBody]}>{t('public.partners.body')}</Text>
          </View>
          <View style={styles.words}>
            {(['public.partners.member', 'public.partners.partner'] as MessageKey[]).map((key) => (
              <View key={key} style={styles.wordCard}>
                <Text style={styles.wordLabel}>{t(key)}</Text>
                {['AMBER', 'RIVER', 'SEVEN'].map((word) => (
                  <Text key={word} style={styles.word}>
                    {word}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Joining. */}
      <View style={[styles.wrap, styles.section]}>
        <Text style={styles.h2} accessibilityRole="header">
          {t('public.join.title')}
        </Text>
        <View style={styles.grid}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={styles.step}>
              <Text style={styles.stepNumber}>{['I', 'II', 'III'][n - 1]}</Text>
              <Text style={styles.areaName}>{t(`public.join.${n}.title` as MessageKey)}</Text>
              <Text style={styles.body}>{t(`public.join.${n}.body` as MessageKey)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Safety and footer. */}
      <View style={styles.safety}>
        <View style={[styles.wrap, styles.safetyRow]}>
          <View style={styles.partnersText}>
            <Text style={[styles.h2, styles.light]} accessibilityRole="header">
              {t('public.safety.title')}
            </Text>
            <Text style={[styles.body, styles.lightBody]}>{t('public.safety.body')}</Text>
          </View>
          {linkButton(t('public.safety.read'), () =>
            router.push({ pathname: '/guides/[slug]', params: { slug: 'staying-safe-online' } }),
          )}
        </View>
        <View style={[styles.wrap, styles.footer]}>
          <Text style={styles.footerText}>{t('public.footer.by')}</Text>
          <Text
            style={styles.footerText}
            onPress={() => Linking.openURL('https://github.com/phe-rus/tero')}
          >
            {t('public.footer.source')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.ivory },
  wrap: { width: '100%', maxWidth: wide, alignSelf: 'center', paddingHorizontal: space.lg },
  hero: { backgroundColor: colors.slate },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.lg,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  nav: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.lg },
  navLink: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.oatLight },
  langs: { flexDirection: 'row', gap: space.sm },
  lang: { fontFamily: fonts.body, fontSize: 13, color: '#B0AEA5', paddingHorizontal: 4 },
  langOn: { color: colors.goldLight, textDecorationLine: 'underline' },
  heroBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.xl + space.lg,
  },
  heroText: { flex: 1, minWidth: 300, gap: space.md },
  kicker: { fontFamily: fonts.bodySemibold, fontSize: 12, letterSpacing: 1.6, color: colors.gold },
  h1: { fontFamily: fonts.display, fontSize: 48, lineHeight: 54, color: colors.ivory },
  lead: { fontFamily: fonts.body, fontSize: 18, lineHeight: 28, color: '#C9C6BD', maxWidth: 560 },
  ctas: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm + 4, marginTop: space.sm },
  cta: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: radii.pill },
  ctaPrimary: { backgroundColor: colors.ivory },
  ctaSecondary: { borderWidth: 1, borderColor: 'rgba(240,238,230,0.35)' },
  ctaPrimaryText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.slate },
  ctaSecondaryText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.oatLight },
  restore: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#B0AEA5',
    textDecorationLine: 'underline',
  },
  heroCard: { alignItems: 'center', flexGrow: 1, minWidth: 260 },
  facts: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(240,238,230,0.15)' },
  factsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, paddingVertical: space.md },
  fact: { fontFamily: fonts.body, fontSize: 13, color: '#B0AEA5' },
  section: { paddingVertical: space.xl + space.md, gap: space.lg },
  sectionHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space.sm,
  },
  h2: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.slate },
  note: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  area: {
    flexGrow: 1,
    flexBasis: 220,
    gap: space.sm,
    padding: space.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  areaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.oatLight,
  },
  areaName: { fontFamily: fonts.bodySemibold, fontSize: 18, color: colors.slate },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.textSecondary },
  guide: {
    flexGrow: 1,
    flexBasis: 300,
    gap: space.xs + 2,
    padding: space.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  guideArea: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.clayText,
  },
  guideTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.slate },
  pressed: { opacity: 0.8 },
  partners: { backgroundColor: colors.slateSoft },
  partnersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.xl,
    paddingVertical: space.xl + space.md,
  },
  partnersText: { flex: 1, minWidth: 300, gap: space.md },
  light: { color: colors.ivory },
  lightBody: { color: '#C9C6BD' },
  words: { flexDirection: 'row', gap: space.md, flexGrow: 1, justifyContent: 'center' },
  wordCard: {
    width: 150,
    paddingVertical: space.lg,
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.slate,
  },
  wordLabel: {
    fontFamily: fonts.card,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.gold,
    marginBottom: 6,
  },
  word: { fontFamily: fonts.card, fontSize: 17, letterSpacing: 2, color: colors.oatLight },
  step: { flexGrow: 1, flexBasis: 240, gap: space.sm },
  stepNumber: { fontFamily: fonts.card, fontSize: 20, color: colors.clayText },
  safety: { backgroundColor: colors.slate },
  safetyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.lg,
    paddingVertical: space.xl + space.md,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(240,238,230,0.15)',
  },
  footerText: { fontFamily: fonts.body, fontSize: 13, color: '#B0AEA5' },
});
