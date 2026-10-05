import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { useLocale } from '@/lib/locale';
import { savePhraseFile } from '@/lib/phrase-file';

/** "Save as a file", with the warning that the file is as good as the account. */
export function SavePhraseFile({ phrase }: { phrase: string }) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await savePhraseFile(phrase, t('phraseFile.save'));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.warning}>
        <Text style={styles.warningTitle}>{t('phraseFile.warningTitle')}</Text>
        <Text style={styles.warningBody}>{t('phraseFile.warning')}</Text>
      </View>
      <Button label={t('phraseFile.save')} onPress={save} kind="secondary" disabled={busy} />
      <Text style={styles.error} accessibilityLiveRegion="polite">
        {failed ? t('phraseFile.failed') : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm + 4, marginTop: space.lg },
  warning: {
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.clay,
    backgroundColor: colors.paper,
    paddingVertical: space.sm + 4,
    paddingHorizontal: space.md,
    gap: space.xs,
  },
  warningTitle: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.slate },
  warningBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  error: { minHeight: 22, fontFamily: fonts.body, fontSize: 15, color: colors.clayText },
});
