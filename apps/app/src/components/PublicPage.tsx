import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, space } from '@tero/ui';
import { CardMark } from '@/components/CardMark';
import { Wordmark } from '@/components/Wordmark';
import { useLocale } from '@/lib/locale';

/** A readable public page: a slim header back to Tero, and a centred column. */
export function PublicPage({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const home = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="link" onPress={home} style={styles.brand}>
            <CardMark height={28} />
            <Wordmark height={15} />
          </Pressable>
          <Text style={styles.link} onPress={() => router.push('/guides')}>
            {t('public.nav.guides')}
          </Text>
        </View>
        <View style={styles.column}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  scroll: { paddingBottom: space.xl * 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
    backgroundColor: colors.ivory,
    zIndex: 10,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  link: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.clayText },
  column: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
  },
});
