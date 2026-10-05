import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Page } from '@/components/Page';
import { localeNames, locales } from '@tero/i18n';
import { useLocale } from '@/lib/locale';

export default function Language() {
  const { t, locale, setLocale } = useLocale();
  return (
    <Page>
      <Text style={styles.title} accessibilityRole="header">
        {t('welcome.language')}
      </Text>
      <View style={styles.list} accessibilityRole="radiogroup">
        {locales.map((code, i) => {
          const selected = code === locale;
          return (
            <Pressable
              key={code}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setLocale(code)}
              style={({ pressed }) => [
                styles.row,
                i > 0 && styles.divider,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.rowText}>{localeNames[code]}</Text>
              {selected && <Text style={styles.tick}>✓</Text>}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.actions}>
        <Button label={t('card.done')} onPress={() => router.back()} kind="quiet" />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.slate },
  list: {
    marginTop: space.lg,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  pressed: { backgroundColor: colors.oatLight },
  rowText: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.slate },
  tick: { fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.clayText },
  actions: { marginTop: space.lg },
});
