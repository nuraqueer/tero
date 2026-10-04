import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@tero/ui';

/** The small tarot-card mark that sits beside the word "Tero". */
export function CardMark({ height = 64 }: { height?: number }) {
  const width = Math.round(height * 0.65);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.outer, { width, height, borderRadius: height * 0.09 }]}
    >
      <View style={[styles.inner, { borderRadius: height * 0.06 }]}>
        <Text style={[styles.star, { fontSize: height * 0.32 }]}>✦</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.slate,
    padding: 4,
  },
  inner: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    color: colors.goldLight,
  },
});
