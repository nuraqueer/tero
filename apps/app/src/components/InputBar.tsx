import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, radii, space } from '@tero/ui';

/** The message bar from the mockups: a round + and a glass field. Disabled until built. */
export function InputBar({ placeholder }: { placeholder: string }) {
  return (
    <View style={styles.row} accessibilityState={{ disabled: true }}>
      <View style={styles.plus}>
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path d="M12 5v14M5 12h14" stroke={colors.slate} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </View>
      <View style={styles.field}>
        <Text style={styles.placeholder}>{placeholder}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, opacity: 0.6 },
  plus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  field: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  placeholder: { fontFamily: fonts.body, fontSize: 16, color: colors.textMuted },
});
