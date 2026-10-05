import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { localeNames } from '@tero/i18n';
import { colors, fonts, radii, space, touchTarget } from '@tero/ui';
import { CardMark } from '@/components/CardMark';
import { PublicHome } from '@/components/PublicHome';
import { Wordmark } from '@/components/Wordmark';
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
  const { locale, t } = useLocale();
  // On the web, the front door is the public site (D40); phones get the welcome screen.
  if (Platform.OS === 'web') return <PublicHome onFounder={openFounderSetup} />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          {/* The founder sets up without a card: a long press on the mark. It only opens
              while the server says the Fool's seat is free (Tero has no members yet), and
              the server gives the seat to the first claim only. */}
          <Pressable onLongPress={openFounderSetup} delayLongPress={1500}>
            <CardMark height={68} />
          </Pressable>
          <View accessibilityRole="header">
            <Wordmark height={34} />
          </View>
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
            onPress={() => router.push('/guides')}
            style={[styles.button, styles.secondary]}
          >
            <Text style={styles.secondaryLabel}>{t('welcome.readGuides')}</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/language')}
          style={({ pressed }) => [styles.langRow, pressed && styles.langPressed]}
        >
          <Text style={styles.langLabel}>{t('welcome.language')}</Text>
          <Text style={styles.langValue}>{localeNames[locale]} ›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  langRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: touchTarget + 4,
    marginTop: space.lg,
    paddingHorizontal: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  langPressed: { opacity: 0.7 },
  langLabel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.slate },
  langValue: { fontFamily: fonts.body, fontSize: 16, color: colors.textSecondary },
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
});
