import { useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { CardBack } from '@/components/CardBack';
import { CardMark } from '@/components/CardMark';
import { Page } from '@/components/Page';
import { PasscodePad } from '@/components/PasscodePad';
import { Wordmark } from '@/components/Wordmark';
import { useLocale } from '@/lib/locale';
import { useSession } from '@/lib/session';

export default function Lock() {
  const { t } = useLocale();
  const { unlock } = useSession();
  const { width } = useWindowDimensions();
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

  const form = (
    <View style={styles.form}>
      <CardMark height={56} />
      <Wordmark height={26} />
      <Text style={styles.prompt}>
        {Platform.OS === 'web' ? t('lock.webPrompt') : t('lock.enterPasscode')}
      </Text>
      <PasscodePad onSubmit={submit} busy={busy} message={message} resetKey={tries} />
      <View style={styles.forgot}>
        <Button label={t('lock.forgot')} kind="quiet" onPress={() => router.push('/restore')} />
      </View>
    </View>
  );

  if (Platform.OS !== 'web') return <Page>{form}</Page>;

  // The web: a quiet split screen. Nothing on it says whose Tero this is.
  return (
    <View style={styles.split}>
      {width >= 900 && (
        <View style={styles.art}>
          <CardBack width={220} />
          <Text style={styles.tagline}>{t('app.tagline')}</Text>
        </View>
      )}
      <View style={styles.side}>
        <View style={styles.panel}>{form}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { alignItems: 'center', gap: space.sm + 2, width: '100%', marginTop: space.md },
  prompt: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: space.sm,
  },
  forgot: { marginTop: space.md, alignItems: 'center' },
  split: { flex: 1, flexDirection: 'row', backgroundColor: colors.ivory },
  art: {
    flex: 1,
    backgroundColor: colors.slate,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xl,
    padding: space.xl,
  },
  tagline: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 34,
    color: colors.oatLight,
    textAlign: 'center',
    maxWidth: 360,
  },
  side: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  panel: {
    width: '100%',
    maxWidth: 420,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    shadowColor: colors.slate,
    shadowOpacity: 0.06,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
  },
});
