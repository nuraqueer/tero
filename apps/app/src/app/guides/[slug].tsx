import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { PublicPage } from '@/components/PublicPage';
import { guides } from '@/guides';
import { useLocale } from '@/lib/locale';

/** Each guide is built as its own page, so links to it open directly. */
export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export default function GuidePage() {
  const { t, locale } = useLocale();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const guide = guides.find((g) => g.slug === slug);

  if (!guide) {
    return (
      <PublicPage>
        <Text style={styles.title}>{t('guides.notFound')}</Text>
      </PublicPage>
    );
  }

  const body = guide.text?.[locale];
  return (
    <PublicPage>
      <Text style={styles.kicker}>
        {t(`area.${guide.area}` as MessageKey).toUpperCase()} · {t('guides.guide').toUpperCase()}
      </Text>
      <Text style={styles.title} accessibilityRole="header">
        {t(`guide.${guide.key}.title` as MessageKey)}
      </Text>
      <Text style={styles.summary}>{t(`guide.${guide.key}.summary` as MessageKey)}</Text>
      {body ? (
        <>
          {body.note && (
            <View style={styles.note}>
              <Text style={styles.noteText}>{body.note}</Text>
            </View>
          )}
          {body.sections.map((section) => (
            <View key={section.id} style={styles.section}>
              <Text style={styles.h2} accessibilityRole="header">
                {section.heading}
              </Text>
              {section.paragraphs.map((p, i) => (
                <Text key={i} style={styles.p}>
                  {p}
                </Text>
              ))}
            </View>
          ))}
          <Text style={styles.review}>{t('guides.review')}</Text>
        </>
      ) : (
        <View style={styles.note}>
          <Text style={styles.noteText}>{t('guides.writingBody')}</Text>
        </View>
      )}
    </PublicPage>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.clayText,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 46,
    color: colors.slate,
    marginTop: space.sm,
  },
  summary: {
    fontFamily: fonts.body,
    fontSize: 18,
    lineHeight: 27,
    color: colors.textSecondary,
    marginTop: space.sm,
  },
  note: {
    marginTop: space.lg,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.oatLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.clay,
  },
  noteText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.slate },
  section: { marginTop: space.xl, gap: space.sm + 4 },
  h2: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.slate },
  p: { fontFamily: fonts.body, fontSize: 17, lineHeight: 27, color: colors.slate },
  review: {
    marginTop: space.xl,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
});
