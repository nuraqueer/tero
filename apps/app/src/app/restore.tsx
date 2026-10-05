import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { isValidPhrase, normalizePhrase } from '@tero/crypto';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Page } from '@/components/Page';
import { useLocale } from '@/lib/locale';
import { SetupFlow } from './setup';

/**
 * Restore with the 12 words: on a new phone or browser, or after forgetting the
 * passcode. The same words give the same Tero address; a new passcode replaces the old one.
 */
export default function Restore() {
  const { t } = useLocale();
  const [typed, setTyped] = useState('');
  const [wrong, setWrong] = useState(false);
  const [phrase, setPhrase] = useState<string | null>(null);

  if (phrase) return <SetupFlow restorePhrase={phrase} />;

  const check = () => {
    const candidate = normalizePhrase(typed);
    if (isValidPhrase(candidate)) setPhrase(candidate);
    else setWrong(true);
  };

  return (
    <Page>
      <Text style={styles.title} accessibilityRole="header">
        {t('restore.title')}
      </Text>
      <Text style={styles.body}>{t('restore.body')}</Text>
      <TextInput
        accessibilityLabel={t('restore.label')}
        placeholder={t('restore.label')}
        placeholderTextColor={colors.textMuted}
        value={typed}
        onChangeText={(text) => {
          setWrong(false);
          setTyped(text);
        }}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        importantForAutofill="no"
        style={styles.input}
      />
      <Text style={styles.error} accessibilityLiveRegion="polite">
        {wrong ? t('restore.wrong') : ''}
      </Text>
      <View style={styles.actions}>
        <Button label={t('setup.continue')} onPress={check} disabled={typed.trim() === ''} />
        <Button label={t('setup.back')} kind="quiet" onPress={() => router.back()} />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.slate,
    textAlign: 'center',
    marginTop: space.lg,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 25,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: space.md,
  },
  input: {
    marginTop: space.lg,
    minHeight: 120,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(31,30,29,0.3)',
    backgroundColor: colors.paper,
    padding: space.md,
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 25,
    color: colors.slate,
    textAlignVertical: 'top',
  },
  error: {
    minHeight: 22,
    marginTop: space.sm,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.clayText,
    textAlign: 'center',
  },
  actions: { gap: space.sm, marginTop: space.md },
});
