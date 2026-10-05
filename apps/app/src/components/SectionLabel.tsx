import { StyleSheet, Text } from 'react-native';
import { colors, fonts, space } from '@tero/ui';

/** A small capitalised label over a group, such as "FROM YOUR CIRCLES". */
export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    marginTop: space.lg,
    marginBottom: space.sm,
    marginLeft: 4,
  },
});
