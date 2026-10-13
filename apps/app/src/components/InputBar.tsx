import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '@tero/ui';

/** A draft never implies delivery is available. */
export function InputBar({
  placeholder,
  value = '',
  onChangeText,
  onSend,
  sendLabel = 'Send',
  editable = false,
  sending = false,
}: {
  placeholder: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSend?: () => void;
  sendLabel?: string;
  editable?: boolean;
  sending?: boolean;
}) {
  const canSend = !!onSend && !sending && value.trim().length > 0;
  return (
    <View style={styles.row}>
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        multiline
        maxLength={1000}
        style={styles.field}
      />
      <Pressable
        hitSlop={5}
        accessibilityRole="button"
        accessibilityLabel={sendLabel}
        accessibilityState={{ disabled: !canSend, busy: sending }}
        disabled={!canSend}
        onPress={onSend}
        style={({ pressed }) => [
          styles.send,
          !canSend && !sending && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        {sending ? (
          <ActivityIndicator size="small" color={colors.paper} />
        ) : (
          <Svg width={19} height={19} viewBox="0 0 24 24">
            <Path
              d="M12 19V5m-6 6 6-6 6 6"
              fill="none"
              stroke={colors.paper}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 5,
    borderRadius: 25,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  field: {
    flex: 1,
    minHeight: 34,
    maxHeight: 116,
    paddingVertical: 7,
    paddingHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.slate,
  },
  send: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.clayText,
    margin: 2,
  },
  disabled: { backgroundColor: colors.oat },
  pressed: { opacity: 0.7 },
});
