import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { InputBar } from '@/components/InputBar';
import { Page } from '@/components/Page';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BoneBubble } from '@/components/Skeleton';
import { SoonNote } from '@/components/SoonNote';
import { useLocale } from '@/lib/locale';

/** A private chat: clears after reading unless both keep it (D20). End-to-end with OpenMLS. */
export default function Chat() {
  const { t } = useLocale();
  return (
    <Page>
      <ScreenHeader title={t('chat.title')} />
      <View style={styles.timer}>
        <Text style={styles.timerText}>{t('messages.clears')}</Text>
      </View>
      <View style={styles.keep}>
        <Text style={styles.keepText}>{t('chat.keep')}</Text>
        <View style={styles.keepButtons}>
          <Button label={t('chat.keepYes')} onPress={() => undefined} disabled />
          <Button label={t('chat.keepNo')} onPress={() => undefined} kind="secondary" disabled />
        </View>
      </View>
      <View style={styles.thread}>
        <BoneBubble width="58%" />
        <BoneBubble mine width="50%" />
        <BoneBubble mine width="66%" />
        <BoneBubble width="40%" />
      </View>
      <Text style={styles.alert}>{t('chat.screenshot')}</Text>
      <SoonNote text={t('chat.soon')} />
      <InputBar placeholder={t('chat.message')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  timer: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(31,30,29,0.06)',
  },
  timerText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  keep: {
    marginTop: space.md,
    padding: space.md,
    gap: space.sm + 4,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  keepText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.slate },
  keepButtons: { gap: space.sm },
  thread: { gap: space.sm + 2, marginTop: space.lg },
  alert: {
    alignSelf: 'center',
    marginTop: space.md,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
});
