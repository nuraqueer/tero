import { StyleSheet, Text, View } from 'react-native';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { Page } from '@/components/Page';
import type { TabName } from '@/components/TabIcons';
import { TabIcon } from '@/components/TabIcons';
import { useLocale } from '@/lib/locale';

/** A tab that isn't built yet: its title and one calm line about what will be here. */
export function SoonTab({ name }: { name: Exclude<TabName, 'you'> }) {
  const { t } = useLocale();
  return (
    <Page tabs>
      <Text style={styles.title} accessibilityRole="header">
        {t(`tabs.${name}` as MessageKey)}
      </Text>
      <View style={styles.panel}>
        <View style={styles.icon}>
          <TabIcon name={name} color={colors.clayText} />
        </View>
        <Text style={styles.body}>{t(`soon.${name}` as MessageKey)}</Text>
        <Text style={styles.note}>{t('soon.note')}</Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 36, lineHeight: 42, color: colors.slate },
  panel: {
    marginTop: space.lg,
    padding: space.lg,
    gap: space.sm + 4,
    borderRadius: radii.lg,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.oatLight,
  },
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: colors.slate },
  note: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
});
