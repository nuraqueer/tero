import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radii, space, touchTarget } from '@tero/ui';
import { useLocale } from '@/lib/locale';

/*
 * The web version of the passcode pad. In a browser the vault's device secret sits in
 * local storage beside the vault, so the passcode is the only protection against
 * someone who copies the browser's data. Six digits can be guessed offline in hours;
 * a passphrase of ten or more characters cannot.
 */

export const minPassphraseLength = 10;

type Props = {
  onSubmit: (code: string) => void;
  message?: string;
  busy?: boolean;
  resetKey?: unknown;
  /**
   * Set when choosing a new passphrase. Unlocking accepts any length, so vaults made
   * before passphrases were required on the web still open.
   */
  choosing?: boolean;
};

export function PasscodePad({
  onSubmit,
  message,
  busy = false,
  resetKey,
  choosing = false,
}: Props) {
  const { t } = useLocale();
  const [code, setCode] = useState('');

  useEffect(() => setCode(''), [resetKey]);

  const ready = code.length >= (choosing ? minPassphraseLength : 1) && !busy;
  const submit = () => {
    if (ready) onSubmit(code);
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        value={code}
        onChangeText={setCode}
        onSubmitEditing={submit}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        accessibilityLabel={t('lock.passphrase.label')}
        placeholder={t('lock.passphrase.label')}
        placeholderTextColor={colors.textMuted}
        editable={!busy}
        style={styles.input}
      />
      {choosing ? (
        <Text style={styles.hint}>{t('lock.passphrase.hint', { count: minPassphraseLength })}</Text>
      ) : null}
      <Text style={styles.message} accessibilityLiveRegion="polite">
        {message ?? ''}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !ready }}
        disabled={!ready}
        onPress={submit}
        style={[styles.enter, !ready && styles.enterDisabled]}
      >
        <Text style={styles.enterLabel}>{busy ? t('lock.opening') : t('lock.enter')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%', marginTop: space.lg },
  input: {
    width: '100%',
    maxWidth: 360,
    minHeight: touchTarget + 4,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(31,30,29,0.3)',
    backgroundColor: colors.paper,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.slate,
  },
  hint: {
    marginTop: space.sm,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  message: {
    minHeight: 22,
    marginTop: space.sm,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.clayText,
    textAlign: 'center',
  },
  enter: {
    marginTop: space.md,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: colors.slate,
    borderRadius: radii.pill,
    paddingVertical: 14,
  },
  enterDisabled: { opacity: 0.35 },
  enterLabel: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.ivory },
});
