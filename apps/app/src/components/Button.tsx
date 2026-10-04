import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radii, space, touchTarget } from '@tero/ui';

type Props = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
};

export function Button({ label, onPress, kind = 'primary', disabled = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[kind],
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, kind === 'primary' ? styles.primaryLabel : styles.otherLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touchTarget + 4,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  primary: { backgroundColor: colors.slate },
  secondary: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  quiet: {},
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
  label: { fontFamily: fonts.bodySemibold, fontSize: 16 },
  primaryLabel: { color: colors.ivory },
  otherLabel: { color: colors.slate },
});
