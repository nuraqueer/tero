import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, space } from '@tero/ui';
import { useLocale } from '@/lib/locale';

export const passcodeLength = 6;

type Props = {
  /** Called with the six digits when the person taps Enter. */
  onSubmit: (code: string) => void;
  /** Shown under the dots, for example after a wrong passcode. */
  message?: string;
  busy?: boolean;
  /** Change this to clear the digits, for example after a wrong passcode. */
  resetKey?: unknown;
  /** Set when choosing a new passcode (the web version asks for a longer passphrase). */
  choosing?: boolean;
};

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

/** Six dots and a round keypad, as on the lock screen mockup. */
export function PasscodePad({ onSubmit, message, busy = false, resetKey }: Props) {
  const { t } = useLocale();
  const [code, setCode] = useState('');

  useEffect(() => setCode(''), [resetKey]);

  const press = (key: (typeof keys)[number]) => {
    if (busy) return;
    if (key === 'del') setCode((c) => c.slice(0, -1));
    else setCode((c) => (c.length < passcodeLength ? c + key : c));
  };

  const full = code.length === passcodeLength;

  return (
    <View style={styles.wrap}>
      <View
        style={styles.dots}
        accessible
        accessibilityLabel={t('lock.progress', { count: code.length })}
      >
        {Array.from({ length: passcodeLength }, (_, i) => (
          <View key={i} style={[styles.dot, i < code.length && styles.dotFilled]} />
        ))}
      </View>
      <Text style={styles.message} accessibilityLiveRegion="polite">
        {message ?? ''}
      </Text>

      <View style={styles.keypad}>
        {keys.map((key, i) =>
          key === '' ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={key === 'del' ? t('lock.delete') : key}
              onPress={() => press(key)}
              style={({ pressed }) => [
                styles.key,
                key !== 'del' && styles.keyRing,
                pressed && styles.keyPressed,
              ]}
            >
              <Text style={key === 'del' ? styles.delete : styles.digit}>
                {key === 'del' ? '⌫' : key}
              </Text>
            </Pressable>
          ),
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !full || busy }}
        disabled={!full || busy}
        onPress={() => onSubmit(code)}
        style={[styles.enter, !full && styles.enterHidden]}
      >
        <Text style={styles.enterLabel}>{busy ? t('lock.opening') : t('lock.enter')}</Text>
      </Pressable>
    </View>
  );
}

const keySize = 76;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  dots: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.clay,
  },
  dotFilled: { backgroundColor: colors.clay },
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
    rowGap: 18,
    width: keySize * 3 + 2 * 28,
    marginTop: space.md,
  },
  key: {
    width: keySize,
    height: keySize,
    borderRadius: keySize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyRing: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(31,30,29,0.22)' },
  keyPressed: { backgroundColor: 'rgba(31,30,29,0.18)' },
  digit: { fontFamily: fonts.display, fontSize: 32, color: colors.slate },
  delete: { fontFamily: fonts.body, fontSize: 26, color: colors.slate },
  enter: {
    marginTop: space.xl,
    backgroundColor: colors.clay,
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: 44,
  },
  enterHidden: { opacity: 0 },
  enterLabel: { fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.slate },
});
