import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, space } from '@tero/ui';
import { useLocale } from '@/lib/locale';

/** A quiet line saying what the placeholder will become. */
export function SoonNote({ text }: { text: string }) {
  const { t } = useLocale();
  return (
    <View style={styles.wrap}>
      <Text style={styles.tag}>{t('suit.soon').toUpperCase()}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4, marginVertical: space.lg, paddingHorizontal: space.md },
  tag: { fontFamily: fonts.bodySemibold, fontSize: 11, letterSpacing: 1, color: colors.clayText },
  text: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
