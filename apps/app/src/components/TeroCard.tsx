import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, space } from '@tero/ui';

/** The tarot-card frame from the design: dark card, gold double border, a star on top. */
export function TeroCard({
  children,
  width = 260,
  bare = false,
}: {
  children: ReactNode;
  width?: number;
  /** Leave out the star and bottom space, for cards that draw their own art. */
  bare?: boolean;
}) {
  return (
    <View style={[styles.card, { width, height: Math.round(width * 1.55) }]}>
      <View style={styles.outer}>
        <View style={[styles.inner, bare && styles.bare]}>
          {!bare && (
            <Text style={styles.star} accessibilityElementsHidden importantForAccessibility="no">
              ✦
            </Text>
          )}
          {children}
          {!bare && <View style={styles.spacer} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    borderRadius: 16,
    backgroundColor: colors.slateSoft,
    padding: 8,
    shadowColor: colors.slate,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  outer: { flex: 1, borderWidth: 1.2, borderColor: colors.gold, borderRadius: 10, padding: 5 },
  inner: {
    flex: 1,
    borderWidth: 0.6,
    borderColor: 'rgba(201,162,126,0.6)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.lg,
    paddingHorizontal: space.sm + 2,
  },
  bare: { paddingTop: 12, paddingBottom: 10, paddingHorizontal: 8 },
  star: { fontSize: 30, color: colors.goldLight },
  spacer: { height: 30 },
});
