import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, space } from '@tero/ui';

/** The large serif title at the top of each tab, with an optional note or button on the right. */
export function TabHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {typeof right === 'string' ? <Text style={styles.note}>{right}</Text> : right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
    minHeight: 48,
  },
  title: { fontFamily: fonts.display, fontSize: 36, lineHeight: 42, color: colors.slate },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
});
