import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radii, space } from '@tero/ui';

/** A labelled text field for member forms. */
export function Field({
  label,
  value,
  onChange,
  max,
  multiline,
  autoCapitalize,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  multiline?: boolean;
  autoCapitalize?: 'characters' | 'sentences';
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        maxLength={max}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.inputMulti]}
      />
    </View>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

/** A small rounded choice: a filter, a radio or a toggle. */
export function Chip({
  label,
  on,
  onPress,
  role = 'checkbox',
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  role?: 'checkbox' | 'radio';
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected: on } : { checked: on }}
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>
        {on && role === 'checkbox' ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function Chips({ children }: { children: React.ReactNode }) {
  return <View style={styles.chips}>{children}</View>;
}

/** A small outlined button inside a list row. */
export function SmallButton({
  label,
  onPress,
  on = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  on?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.small,
        on && styles.smallOn,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Text style={[styles.smallText, on && styles.smallTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 4 },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: space.sm,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: space.sm + 4,
    borderRadius: radii.sm,
    backgroundColor: colors.ivory,
    borderWidth: 1,
    borderColor: 'rgba(31,30,29,0.15)',
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.slate,
  },
  inputMulti: { minHeight: 96, paddingTop: space.sm, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(31,30,29,0.15)',
  },
  chipOn: { backgroundColor: colors.oatLight, borderColor: colors.clayText },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate },
  chipTextOn: { color: colors.clayText },
  small: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(31,30,29,0.18)',
  },
  smallOn: { backgroundColor: colors.slate, borderColor: colors.slate },
  smallText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate },
  smallTextOn: { color: colors.ivory },
  pressed: { opacity: 0.7 },
});
