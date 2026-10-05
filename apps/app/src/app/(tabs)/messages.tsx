import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, space } from '@tero/ui';
import { EmptyState } from '@/components/EmptyState';
import { Page } from '@/components/Page';
import { TabHeader } from '@/components/TabHeader';
import { TabIcon } from '@/components/TabIcons';
import { useLocale } from '@/lib/locale';

/** Private chats. They clear 24 hours after reading unless both people agree to keep them. */
export default function Messages() {
  const { t } = useLocale();
  return (
    <Page tabs>
      <TabHeader title={t('tabs.messages')} />
      <View style={styles.timer}>
        <Text style={styles.timerText}>{t('messages.clears')}</Text>
      </View>
      <EmptyState
        icon={<TabIcon name="messages" color={colors.clayText} />}
        title={t('messages.empty.title')}
        body={t('messages.empty.body')}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  timer: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(31,30,29,0.06)',
    marginBottom: space.lg,
  },
  timerText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
});
