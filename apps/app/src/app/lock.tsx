import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, space } from '@tero/ui';
import { CardMark } from '@/components/CardMark';
import { Page } from '@/components/Page';
import { PasscodePad } from '@/components/PasscodePad';
import { Button } from '@/components/Button';
import { router } from 'expo-router';
import { useLocale } from '@/lib/locale';
import { useSession } from '@/lib/session';

export default function Lock() {
  const { t } = useLocale();
  const { unlock } = useSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [tries, setTries] = useState(0);

  const submit = async (code: string) => {
    setBusy(true);
    setMessage(undefined);
    try {
      const result = await unlock(code);
      // On success the session opens and this screen goes away. The real and decoy
      // passcodes behave exactly the same here.
      if (!result.ok) {
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
      <View style={styles.brand}>
        <CardMark height={68} />
        <Text style={styles.wordmark} accessibilityRole="header">
          Tero
        </Text>
        <Text style={styles.prompt}>
          {Platform.OS === 'web' ? t('lock.passphrase.label') : t('lock.enterPasscode')}
        </Text>
      </View>
      <PasscodePad onSubmit={submit} busy={busy} message={message} resetKey={tries} />
      <View style={styles.forgot}>
        <Button label={t('lock.forgot')} kind="quiet" onPress={() => router.push('/restore')} />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: 14, marginTop: space.xl },
  wordmark: { fontFamily: fonts.mark, fontSize: 44, color: colors.slate, letterSpacing: 0.9 },
  forgot: { marginTop: space.lg, alignItems: 'center' },
  prompt: { fontFamily: fonts.body, fontSize: 16, color: colors.textSecondary },
});
