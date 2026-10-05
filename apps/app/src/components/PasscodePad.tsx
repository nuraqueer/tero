import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, space } from '@tero/ui';
import { useLocale } from '@/lib/locale';

export const passcodeLength = 6;

type Props = {
  /** Called with the six digits as soon as the sixth is entered. */
  onSubmit: (code: string) => void;
  /** Shown under the dots, for example after a wrong passcode. */
  message?: string;
  busy?: boolean;
  /** Change this to clear the digits, for example after a wrong passcode. */
  resetKey?: unknown;
  /** Set when choosing a new passcode (the web version asks for a longer passphrase). */
  choosing?: boolean;
};

const keys = [
  ['1', ''],
  ['2', 'ABC'],
  ['3', 'DEF'],
  ['4', 'GHI'],
  ['5', 'JKL'],
  ['6', 'MNO'],
  ['7', 'PQRS'],
  ['8', 'TUV'],
  ['9', 'WXYZ'],
] as const;

/** Small dots and round glass keys, in the style of the phone's own lock screen. */
export function PasscodePad({ onSubmit, message, busy = false, resetKey }: Props) {
  const { t } = useLocale();
  const [code, setCode] = useState('');
  const shake = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  // A reset after the first one means the passcode was wrong or didn't match: shake.
  useEffect(() => {
    setCode('');
    if (first.current) {
      first.current = false;
      return;
    }
    if (!message) return;
    shake.setValue(0);
    Animated.sequence(
      [14, -12, 9, -6, 3, 0].map((toValue) =>
        Animated.timing(shake, { toValue, duration: 55, useNativeDriver: true }),
      ),
    ).start();
  }, [resetKey]);

  // Enter on its own once the sixth digit is in, after the last dot has filled.
  useEffect(() => {
    if (code.length !== passcodeLength) return;
    const timer = setTimeout(() => onSubmit(code), 120);
    return () => clearTimeout(timer);
  }, [code]);

  const press = (digit: string) => {
    if (busy) return;
    setCode((c) => (c.length < passcodeLength ? c + digit : c));
  };
  const remove = () => !busy && setCode((c) => c.slice(0, -1));

  const digitKey = (digit: string, letters = '') => (
    <Pressable
      key={digit}
      accessibilityRole="button"
      accessibilityLabel={digit}
      onPress={() => press(digit)}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
    >
      <Text style={styles.digit}>{digit}</Text>
      <Text style={styles.letters}>{letters}</Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[styles.dots, { transform: [{ translateX: shake }] }]}
        accessible
        accessibilityLabel={t('lock.progress', { count: code.length })}
      >
        {Array.from({ length: passcodeLength }, (_, i) => (
          <View key={i} style={[styles.dot, i < code.length && styles.dotFilled]} />
        ))}
      </Animated.View>
      <Text style={styles.message} accessibilityLiveRegion="polite">
        {busy ? t('lock.opening') : (message ?? '')}
      </Text>

      <View style={styles.keypad}>
        {keys.map(([digit, letters]) => digitKey(digit, letters))}
        <View style={styles.spacer} />
        {digitKey('0')}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('lock.delete')}
          accessibilityState={{ disabled: code.length === 0 }}
          disabled={code.length === 0}
          onPress={remove}
          style={({ pressed }) => [styles.spacer, styles.textKey, pressed && styles.textPressed]}
        >
          <Text style={[styles.delete, code.length === 0 && styles.hidden]}>
            {t('lock.delete')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const keySize = 78;
const gap = 26;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  dots: { flexDirection: 'row', gap: 18, marginTop: space.lg },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.2,
    borderColor: colors.slate,
  },
  dotFilled: { backgroundColor: colors.slate },
  message: {
    minHeight: 22,
    marginTop: space.md,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.clayText,
    textAlign: 'center',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
    width: keySize * 3 + gap * 2,
    marginTop: space.md,
  },
  // Frosted glass: a faint fill, a light rim and a soft shadow underneath.
  key: {
    width: keySize,
    height: keySize,
    borderRadius: keySize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31,30,29,0.055)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#1F1E1D',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  keyPressed: { backgroundColor: 'rgba(31,30,29,0.2)', transform: [{ scale: 0.96 }] },
  digit: { fontFamily: fonts.body, fontSize: 34, lineHeight: 38, color: colors.slate },
  letters: {
    fontFamily: fonts.bodySemibold,
    fontSize: 9.5,
    letterSpacing: 2,
    color: colors.slate,
    minHeight: 12,
  },
  spacer: { width: keySize, height: keySize },
  textKey: { alignItems: 'center', justifyContent: 'center' },
  textPressed: { opacity: 0.5 },
  delete: { fontFamily: fonts.body, fontSize: 17, color: colors.slate },
  hidden: { opacity: 0 },
});
