import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fonts, radii, space } from '@tero/ui';
import { AppHeader } from '@/components/AppHeader';
import { BiometricIcon } from '@/components/BiometricIcon';
import { Page } from '@/components/Page';
import { biometricKind, biometricOn, disableBiometric, type BiometricKind } from '@/lib/biometric';
import { useLocale } from '@/lib/locale';
import { useSession } from '@/lib/session';

/** Face ID or fingerprint unlock (D48): one switch, like the phone's own settings. */
export default function BiometricSettings() {
  const { t } = useLocale();
  const { enableBiometric } = useSession();
  const [kind, setKind] = useState<BiometricKind | null | undefined>(undefined);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    void biometricKind().then(setKind);
    void biometricOn().then(setOn);
  }, []);

  const name = t(
    kind === 'face' ? 'bio.face' : kind === 'fingerprint' ? 'bio.fingerprint' : 'bio.other',
  );

  const toggle = async (next: boolean) => {
    setMessage(undefined);
    if (!next) {
      await disableBiometric();
      setOn(false);
      return;
    }
    setBusy(true);
    const result = await enableBiometric(t('bio.prompt'));
    setBusy(false);
    if (result === 'on') setOn(true);
    else if (result === 'failed') setMessage(t('bio.failed'));
  };

  return (
    <Page>
      <AppHeader />
      <View style={styles.hero}>
        <View style={styles.icon}>
          <BiometricIcon kind={kind ?? 'face'} size={34} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {kind === undefined ? '' : name}
        </Text>
      </View>

      {kind === null ? (
        <Text style={styles.footnote}>{t('bio.unavailable')}</Text>
      ) : (
        kind && (
          <>
            <View style={styles.group}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('bio.title', { name })}</Text>
                <Switch
                  value={on}
                  disabled={busy}
                  onValueChange={(v) => void toggle(v)}
                  trackColor={{ true: colors.clay, false: 'rgba(31,30,29,0.16)' }}
                  accessibilityLabel={t('bio.title', { name })}
                />
              </View>
            </View>
            <Text style={styles.footnote}>{t('bio.body', { name })}</Text>
            {message && <Text style={styles.problem}>{message}</Text>}

            <Text style={styles.groupLabel}>{t('bio.warningTitle')}</Text>
            <View style={styles.group}>
              <Text style={styles.groupText}>{t('bio.warning', { name })}</Text>
            </View>
          </>
        )
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, marginTop: space.lg, marginBottom: space.lg },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.slate },
  group: {
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    minHeight: 54,
    paddingHorizontal: space.md,
  },
  rowLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.slate },
  footnote: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: space.sm,
    paddingHorizontal: space.md,
  },
  problem: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.clayText,
    marginTop: space.sm,
    paddingHorizontal: space.md,
  },
  groupLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: space.xl,
    marginBottom: space.sm,
    paddingHorizontal: space.md,
  },
  groupText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.slate,
    padding: space.md,
  },
});
