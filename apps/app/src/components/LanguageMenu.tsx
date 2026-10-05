import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { localeNames, locales } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { useLocale } from '@/lib/locale';

/** The language, as one button that opens a list. Stays tidy however many languages come. */
export function LanguageMenu() {
  const { t, locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('welcome.language')}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>{localeNames[locale]}</Text>
        <Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
      </Pressable>
      {open && (
        <View style={styles.menu}>
          <ScrollView style={styles.scroll} accessibilityRole="radiogroup">
            {locales.map((code) => {
              const selected = code === locale;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                >
                  <Text style={[styles.itemText, selected && styles.itemSelected]}>
                    {localeNames[code]}
                  </Text>
                  {selected && <Text style={styles.tick}>✓</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 20 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(31,30,29,0.15)',
  },
  pressed: { opacity: 0.7 },
  buttonText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate },
  chevron: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  menu: {
    position: 'absolute',
    top: 42,
    right: 0,
    minWidth: 200,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  scroll: { maxHeight: 320 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: space.md,
  },
  itemPressed: { backgroundColor: colors.oatLight },
  itemText: { fontFamily: fonts.body, fontSize: 15, color: colors.slate },
  itemSelected: { fontFamily: fonts.bodySemibold },
  tick: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.clayText },
});
