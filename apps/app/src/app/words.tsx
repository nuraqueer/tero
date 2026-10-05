import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, space } from '@tero/ui';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Page } from '@/components/Page';
import { PasscodePad } from '@/components/PasscodePad';
import { PhraseWords } from '@/components/PhraseWords';
import { SavePhraseFile } from '@/components/SavePhraseFile';
import { useLocale } from '@/lib/locale';
import { useSession } from '@/lib/session';

/**
 * The 12 words, for a member who is already in. The words are not kept in memory while
 * the app is open, so the passcode is asked for again and the words leave with this screen.
 */
export default function RecoveryWords() {
  const { t } = useLocale();
  const { revealPhrase } = useSession();
  const [phrase, setPhrase] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [tries, setTries] = useState(0);

  const submit = async (code: string) => {
    setBusy(true);
    setMessage(undefined);
    try {
      const result = await revealPhrase(code);
      // The decoy passcode switches to the plain view and this screen goes away.
      if (result.ok) setPhrase(result.phrase);
      else if ('waitMs' in result) {
        const seconds = Math.ceil(result.waitMs / 1000);
        setMessage(seconds > 0 ? t('lock.wait', { seconds }) : t('lock.wrong'));
        setTries((n) => n + 1);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <AppHeader />
      <Text style={styles.title} accessibilityRole="header">
        {t('words.title')}
      </Text>
      {phrase ? (
        <>
          <Text style={styles.body}>{t('words.body')}</Text>
          <PhraseWords words={phrase.split(' ')} />
          <SavePhraseFile phrase={phrase} />
        </>
      ) : (
        <>
          <Text style={styles.body}>
            {Platform.OS === 'web' ? t('words.askWeb') : t('words.ask')}
          </Text>
          <PasscodePad onSubmit={submit} busy={busy} message={message} resetKey={tries} />
        </>
      )}
      <View style={styles.actions}>
        <Button label={t('card.done')} onPress={() => router.back()} kind="quiet" />
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
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 25,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: space.md,
  },
  actions: { marginTop: space.lg },
});
