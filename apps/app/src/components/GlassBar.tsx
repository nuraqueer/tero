import { forwardRef, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The floating glass tab bar. iOS and the web blur what scrolls underneath; Android gets
 * a solid tint instead, so budget phones stay quick (docs/design.md).
 */
export const GlassBar = forwardRef<View, ViewProps & { children?: ReactNode }>(function GlassBar(
  { children, style, ...props },
  ref,
) {
  const insets = useSafeAreaInsets();
  const blur = Platform.OS !== 'android';
  return (
    <View ref={ref} {...props} style={[styles.wrap, { bottom: barBottom(insets.bottom) }, style]}>
      {blur && <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />}
      <View style={[StyleSheet.absoluteFill, blur ? styles.tint : styles.solid]} />
      <View style={styles.row}>{children}</View>
    </View>
  );
});

/** Sits low, as on iOS 26: inside the home-indicator area on phones that have one. */
function barBottom(inset: number): number {
  return inset > 0 ? Math.max(inset - 18, 6) : 8;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: 488,
    alignSelf: 'center',
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(31,30,29,0.18)',
    shadowColor: '#141413',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  tint: { backgroundColor: 'rgba(240,238,230,0.62)' },
  // A bright edge along the top, like light catching the rim of glass.
  rim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.95)',
  },
  solid: { backgroundColor: '#FFFFFF' },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
});
