import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, space } from '@tero/ui';
import { BiometricIcon } from '@/components/BiometricIcon';
import {
  biometricAsked,
  biometricOn,
  biometricSupport,
  disableBiometric,
  setBiometricAsked,
  type BiometricKind,
  type BiometricSupport,
} from '@/lib/biometric';
import { useLocale } from '@/lib/locale';
import { useSession } from '@/lib/session';

export const biometricName = (kind: BiometricKind): MessageKey => `bio.kind.${kind}` as MessageKey;

/** Face ID, Touch ID, fingerprint or face unlock: a switch, as in the phone's settings. */
export function BiometricRow() {
  const { t } = useLocale();
  const { enableBiometric } = useSession();
  const [support, setSupport] = useState<BiometricSupport | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    void biometricSupport().then(setSupport);
    void biometricOn().then(setOn);
  }, []);

  if (!support || (!support.ok && support.reason === 'none')) return null;
  const name = t(biometricName(support.kind));

  const toggle = async (next: boolean) => {
    setMessage(undefined);
    if (!next) {
      await disableBiometric();
      setOn(false);
      return;
    }
    setBusy(true);
    const result = await enableBiometric(t('bio.prompt'), t('bio.usePasscode'));
    setBusy(false);
    if (result === 'on') setOn(true);
    else if (result === 'failed') setMessage(t('bio.failed'));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <BiometricIcon kind={support.kind} size={22} />
        <View style={styles.text}>
          <Text style={styles.label}>{name}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, on && support.ok && styles.dotOn]} />
            <Text style={styles.status} accessibilityLiveRegion="polite">
              {!support.ok
                ? t('bio.statusUnavailable')
                : on
                  ? t('bio.statusOn', { name })
                  : t('bio.statusOff')}
            </Text>
          </View>
        </View>
        <Switch
          value={on}
          disabled={busy || !support.ok}
          onValueChange={(v) => void toggle(v)}
          trackColor={{ true: colors.clay, false: 'rgba(31,30,29,0.16)' }}
          accessibilityLabel={name}
        />
      </View>
      <Text style={styles.foot}>{support.ok ? t('bio.footnote') : t('bio.expoGo', { name })}</Text>
      {message && <Text style={styles.problem}>{message}</Text>}
    </View>
  );
}

/**
 * After a passcode unlock: offers biometric unlock once, with the phone's own alert.
 * One tap turns it on. Nothing happens if it's on, unsupported or already offered.
 */
export async function offerBiometric(
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
  enable: (prompt: string, cancel: string) => Promise<unknown>,
) {
  const support = await biometricSupport();
  if (!support.ok || (await biometricOn()) || (await biometricAsked())) return;
  await setBiometricAsked();
  const name = t(biometricName(support.kind));
  Alert.alert(t('bio.offerTitle', { name }), t('bio.offerBody'), [
    { text: t('bio.notNow'), style: 'cancel' },
    {
      text: t('bio.turnOn'),
      onPress: () =>
        void enable(t('bio.prompt'), t('bio.usePasscode')).then((result) => {
          if (result === 'on') Alert.alert(t('bio.nowOn', { name }), t('bio.nowOnBody', { name }));
        }),
    },
  ]);
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 4,
    minHeight: 54,
    paddingHorizontal: space.md,
    borderRadius: 14,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  text: { flex: 1, paddingVertical: space.sm, gap: 2 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.slate },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(31,30,29,0.25)' },
  dotOn: { backgroundColor: '#3E8E5E' },
  status: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  foot: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: space.sm,
    paddingHorizontal: space.md,
  },
  problem: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.clayText,
    marginTop: 4,
    paddingHorizontal: space.md,
  },
});
