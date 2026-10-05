import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { CardMark } from '@/components/CardMark';
import { Page } from '@/components/Page';
import { PasscodePad } from '@/components/PasscodePad';
import { Wordmark } from '@/components/Wordmark';
import { biometricKind, biometricOn, type BiometricKind } from '@/lib/biometric';
import { useLocale } from '@/lib/locale';
import { useSession } from '@/lib/session';

export default function Lock() {
  const { t } = useLocale();
  const { unlock, unlockWithBiometric } = useSession();
  // Face ID or fingerprint, if the member turned it on (phones only).
  const [bio, setBio] = useState<BiometricKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [tries, setTries] = useState(0);

  const tryBiometric = useCallback(async () => {
    const result = await unlockWithBiometric(t('bio.prompt'));
    if (result === 'gone') {
      setBio(null);
      setMessage(t('bio.gone'));
    }
  }, [t, unlockWithBiometric]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void (async () => {
      if (!(await biometricOn())) return;
      const kind = await biometricKind();
      if (!kind) return;
      setBio(kind);
      void tryBiometric();
    })();
    // Ask once when the lock screen appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {bio && (
        <Button
          label={t('bio.use', {
            name: t(
              bio === 'face' ? 'bio.face' : bio === 'fingerprint' ? 'bio.fingerprint' : 'bio.other',
            ),
          })}
          kind="secondary"
          onPress={() => void tryBiometric()}
        />
      )}
      <View style={styles.forgot}>
        <Button label={t('lock.forgot')} kind="quiet" onPress={() => router.push('/restore')} />
      </View>
    </View>
  );

  if (Platform.OS !== 'web') return <Page>{form}</Page>;

  // The web: a plain, calm sign-in. Nothing on it says whose Tero this is.
  return (
    <View style={styles.web}>
      <View style={styles.webColumn}>
        <View style={styles.webBrand}>
          <CardMark height={30} />
          <Wordmark height={20} />
        </View>
        <Text style={styles.webTitle} accessibilityRole="header">
          {t('lock.webTitle')}
        </Text>
        <Text style={styles.webSub}>{t('lock.webPrompt')}</Text>
        <PasscodePad onSubmit={submit} busy={busy} message={message} resetKey={tries} />
        <Text style={styles.webLink} onPress={() => router.push('/restore')}>
          {t('lock.forgot')}
        </Text>
      </View>
      <Text style={styles.webFoot}>{t('lock.webFoot')}</Text>
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
  web: {
    flex: 1,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  webColumn: { width: '100%', maxWidth: 380, gap: space.xs },
  webBrand: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xl },
  webTitle: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.slate },
  webSub: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  webLink: {
    alignSelf: 'center',
    marginTop: space.md,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  webFoot: {
    position: 'absolute',
    bottom: space.lg,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
});
