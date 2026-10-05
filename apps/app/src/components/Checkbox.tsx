import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, space, touchTarget } from '@tero/ui';

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.row}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <Text style={styles.tick}>✓</Text>}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4, minHeight: touchTarget },
  box: {
    width: 24,
    height: 24,
    borderRadius: radii.sm - 2,
    borderWidth: 1.5,
    borderColor: colors.slate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.slate },
  tick: { color: colors.ivory, fontSize: 15, lineHeight: 18 },
  label: { flex: 1, fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.slate },
});
