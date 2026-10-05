import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Page } from '@/components/Page';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SoonNote } from '@/components/SoonNote';
import { useLocale } from '@/lib/locale';

/** Help now. Country crisis lines arrive with the country packs (M6). */
export default function Crisis() {
  const { t } = useLocale();
  return (
    <Page>
      <ScreenHeader title={t('help.crisis.title')} />
      <View style={styles.panel}>
        <Text style={styles.title}>{t('crisis.now.title')}</Text>
        <Text style={styles.body}>{t('crisis.now.body')}</Text>
      </View>
      <View style={styles.actions}>
        <Button
          label={t('part.listen')}
          onPress={() => router.push({ pathname: '/part/[part]', params: { part: 'listen' } })}
        />
        <Button
          label={t('crisis.guide')}
          onPress={() =>
            router.push({ pathname: '/guides/[slug]', params: { slug: 'when-you-need-someone' } })
          }
          kind="secondary"
        />
      </View>
      <SoonNote text={t('crisis.soon')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: space.lg,
    gap: space.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.slate,
  },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.ivory },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: '#C9C6BD' },
  actions: { gap: space.sm, marginTop: space.lg },
});
