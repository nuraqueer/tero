import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fonts } from '@tero/ui';
import { useMessageNotifications } from '@/lib/message-notifications';
import { useChatPresence } from '@/lib/chat-presence';
import { useLocale } from '@/lib/locale';

export function MessageSettings() {
  const { t } = useLocale();
  const notifications = useMessageNotifications();
  const presence = useChatPresence();
  const [problem, setProblem] = useState(false);
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        {t('messages.settings')}
      </Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.words}>
            <Text style={styles.title}>{t('messages.notifications')}</Text>
            <Text style={styles.body}>{t('messages.genericAlerts')}</Text>
          </View>
          <Switch
            accessibilityLabel={t('messages.notifications')}
            value={notifications.status === 'enabled'}
            disabled={notifications.status === 'enabling'}
            onValueChange={(value) => {
              void (value ? notifications.enable() : notifications.disable());
            }}
            trackColor={{ true: colors.clayText }}
          />
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.status}>
          {t(`messages.notifications.${notifications.status}`)}
        </Text>
        {notifications.status === 'error' && (
          <Pressable
            accessibilityRole="button"
            onPress={() => void notifications.enable()}
            style={styles.retry}
          >
            <Text style={styles.retryText}>{t('chat.retry')}</Text>
          </Pressable>
        )}
        {notifications.status === 'denied' && (
          <Pressable
            accessibilityRole="button"
            onPress={() => void Linking.openSettings()}
            style={styles.retry}
          >
            <Text style={styles.retryText}>{t('messages.openSettings')}</Text>
          </Pressable>
        )}
        <View style={[styles.row, styles.divider]}>
          <View style={styles.words}>
            <Text style={styles.title}>{t('messages.showActivity')}</Text>
            <Text style={styles.body}>{t('messages.activityHint')}</Text>
          </View>
          <Switch
            accessibilityLabel={t('messages.showActivity')}
            value={presence.visible}
            onValueChange={(value) => {
              setProblem(false);
              void presence.setVisible(value).catch(() => setProblem(true));
            }}
            trackColor={{ true: colors.clayText }}
          />
        </View>
        {problem && <Text style={styles.status}>{t('dir.failed')}</Text>}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  section: { marginTop: 26, marginBottom: 20 },
  heading: { fontFamily: fonts.display, fontSize: 25, color: colors.slate, marginBottom: 13 },
  card: { backgroundColor: colors.paper, borderRadius: 18, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  words: { flex: 1, gap: 4 },
  title: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate },
  body: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  status: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    paddingBottom: 12,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  retryText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.clayText },
});
