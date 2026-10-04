import { StyleSheet, Text, View } from 'react-native';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { AppHeader } from '@/components/AppHeader';
import { Page } from '@/components/Page';
import { useLocale } from '@/lib/locale';

// Opened by the decoy passcode. It shows only public information, and nothing here
// may say or hint that it is a decoy or that anything else exists.

const guides: MessageKey[] = ['basic.guide.health', 'basic.guide.online', 'basic.guide.travel'];

export default function Basic() {
  const { t } = useLocale();
  return (
    <Page>
      <AppHeader />
      <Text style={styles.title} accessibilityRole="header">
        {t('basic.title')}
      </Text>
      <Text style={styles.body}>{t('basic.body')}</Text>
      <View style={styles.list}>
        {guides.map((key) => (
          <View key={key} style={styles.item}>
            <Text style={styles.itemText}>{t(key)}</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.slate },
  body: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 25,
    color: colors.textSecondary,
    marginTop: space.sm,
  },
  list: { gap: space.sm + 4, marginTop: space.lg },
  item: {
    backgroundColor: colors.paper,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: space.lg,
  },
  itemText: { fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.slate },
});
