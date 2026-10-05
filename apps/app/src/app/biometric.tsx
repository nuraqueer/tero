import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, space } from '@tero/ui';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Page } from '@/components/Page';
import { PasscodePad } from '@/components/PasscodePad';
import { biometricKind, biometricOn, disableBiometric, type BiometricKind } from '@/lib/biometric';
import { useLocale } from '@/lib/locale';
import { useSession } from '@/lib/session';

/** Opt-in Face ID or fingerprint unlock (D48). Phones only. */
export default function BiometricSettings() {
  const { t } = useLocale();
  const { enableBiometric } = useSession();
  const [kind, setKind] = useState<BiometricKind | null | undefined>(undefined);
  const [on, setOn] = useState(false);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    void biometricKind().then(setKind);
    void biometricOn().then(setOn);
  }, []);

  const name = t(
    kind === 'face' ? 'bio.face' : kind === 'fingerprint' ? 'bio.fingerprint' : 'bio.other',
  );

  const submit = async (code: string) => {
    setBusy(true);
    setMessage(undefined);
    try {
      const result = await enableBiometric(code, t('bio.prompt'));
      // The decoy passcode switches to the plain view and this screen goes away.
      if (result.ok) {
        setOn(true);
        setAsking(false);
      } else if ('waitMs' in result) {
        const seconds = Math.ceil(result.waitMs / 1000);
        setMessage(seconds > 0 ? t('lock.wait', { seconds }) : t('lock.wrong'));
        setTries((n) => n + 1);
      } else if ('failed' in result) {
        setMessage(t('bio.failed'));
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
        {t('bio.title', { name })}
      </Text>
      {kind === null && <Text style={styles.body}>{t('bio.unavailable')}</Text>}
      {kind && (
        <>
          <Text style={styles.body}>{t('bio.body', { name })}</Text>
          <View style={styles.warning}>
            <Text style={styles.warningTitle}>{t('bio.warningTitle')}</Text>
            <Text style={styles.warningText}>{t('bio.warning', { name })}</Text>
          </View>
          <Text style={styles.state}>{on ? t('bio.isOn') : t('bio.isOff')}</Text>
          {on ? (
            <Button
              label={t('bio.turnOff')}
              kind="secondary"
              onPress={() => void disableBiometric().then(() => setOn(false))}
            />
          ) : asking ? (
            <>
              <Text style={styles.body}>{t('bio.ask')}</Text>
              <PasscodePad onSubmit={submit} busy={busy} message={message} resetKey={tries} />
              <Button label={t('dir.form.cancel')} kind="quiet" onPress={() => setAsking(false)} />
            </>
          ) : (
            <Button label={t('bio.turnOn', { name })} onPress={() => setAsking(true)} />
          )}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.slate, marginTop: space.md },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    marginVertical: space.md,
  },
  warning: {
    padding: space.md,
    gap: 4,
    borderRadius: radii.md,
    backgroundColor: colors.oatLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.clay,
  },
  warningTitle: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.slate },
  warningText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.slate },
  state: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.slate,
    marginVertical: space.lg,
  },
});
