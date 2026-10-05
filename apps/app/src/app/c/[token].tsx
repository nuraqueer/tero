import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { isCardToken } from '@tero/protocol';
import { colors, fonts, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { CardMark } from '@/components/CardMark';
import { Checkbox } from '@/components/Checkbox';
import { Page } from '@/components/Page';
import { useLocale } from '@/lib/locale';
import { useSession } from '@/lib/session';

// Where a card's QR code leads. It stays neutral: nothing about the inviter, other
// members or the card itself is shown before it is claimed.

export default function CardLanding() {
  const { t } = useLocale();
  const { startJoin } = useSession();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const valid = isCardToken(token);

  const accept = async () => {
    if (!valid) return;
    setBusy(true);
    setProblem(undefined);
    const result = await startJoin(token);
    setBusy(false);
    if (result.ok) router.replace('/setup');
    else setProblem(result.error === 'network' ? t('claim.offline') : t('claim.unavailable'));
  };

  return (
    <Page center>
      <View style={styles.brand}>
        <CardMark height={68} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {t('claim.title')}
      </Text>
      <Text style={styles.body}>{valid ? t('claim.body') : t('claim.unavailable')}</Text>
      {valid && (
        <View style={styles.form}>
          <Checkbox label={t('claim.adult')} checked={adult} onChange={setAdult} />
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {problem ?? ''}
          </Text>
          <Button
            label={busy ? t('claim.accepting') : t('claim.accept')}
            onPress={accept}
            disabled={!adult || busy}
          />
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', marginBottom: space.lg },
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
  form: { marginTop: space.xl, gap: space.sm },
  error: {
    minHeight: 22,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.clayText,
    textAlign: 'center',
  },
});
