import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { locales, localeNames } from '@tero/i18n';
import { colors, fonts, radii, space, touchTarget } from '@tero/ui';
import { CardMark } from '@/components/CardMark';
import { founderSeatOpen } from '@/lib/api';
import { useLocale } from '@/lib/locale';

async function openFounderSetup() {
  try {
    if (await founderSeatOpen()) router.push('/setup');
  } catch {
    // Offline or closed: nothing happens, as for anyone else.
  }
}

export default function Welcome() {
  const { locale, setLocale, t } = useLocale();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.brand}>
          {/* The founder sets up without a card: a long press on the mark. It only opens
              while the server says the Fool's seat is free (Tero has no members yet), and
              the server gives the seat to the first claim only. */}
          <Pressable onLongPress={openFounderSetup} delayLongPress={1500}>
            <CardMark height={68} />
          </Pressable>
          <Text style={styles.wordmark} accessibilityRole="header">
            Tero
          </Text>
        </View>

        <Text style={styles.tagline}>{t('app.tagline')}</Text>
        <Text style={styles.body}>{t('welcome.body')}</Text>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/scan')}
            style={[styles.button, styles.primary]}
          >
            <Text style={styles.primaryLabel}>{t('welcome.haveCard')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/restore')}
            style={[styles.button, styles.secondary]}
          >
            <Text style={styles.secondaryLabel}>{t('welcome.restore')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={[styles.button, styles.secondary]}
          >
            <Text style={styles.secondaryLabel}>{t('welcome.readGuides')}</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>{t('welcome.language')}</Text>
        <View style={styles.languages} accessibilityRole="radiogroup">
          {locales.map((code) => {
            const selected = code === locale;
            return (
              <Pressable
                key={code}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setLocale(code)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                  {localeNames[code]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  page: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  brand: { alignItems: 'center', gap: space.md, marginBottom: space.xl },
  wordmark: { fontFamily: fonts.mark, fontSize: 44, color: colors.slate },
  tagline: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.slate,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 25,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: space.md,
  },
  actions: { gap: space.sm + 4, marginTop: space.xl },
  button: {
    minHeight: touchTarget + 4,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  primary: { backgroundColor: colors.slate },
  primaryLabel: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.ivory },
  secondary: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  secondaryLabel: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.slate },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: space.xl,
  },
  languages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.sm + 4,
  },
  chip: {
    minHeight: touchTarget - 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  chipSelected: { backgroundColor: colors.slate, borderColor: colors.slate },
  chipLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate },
  chipLabelSelected: { color: colors.ivory },
});
