import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, space } from '@tero/ui';
import { AppHeader } from '@/components/AppHeader';
import { Page } from '@/components/Page';
import { useLocale } from '@/lib/locale';
import { useSession } from '@/lib/session';

export default function Home() {
  const { t } = useLocale();
  const { state } = useSession();
  if (state.status !== 'open' || state.mode !== 'full') return null;

  const connection = {
    connecting: t('home.connecting'),
    connected: t('home.connected'),
    offline: t('home.offline'),
  }[state.connection];

  return (
    <Page>
      <AppHeader />
      <View style={styles.card}>
        <Text style={styles.label}>{t('home.address')}</Text>
        <Text style={styles.address} selectable>
          {state.identity.did}
        </Text>
        <View style={styles.status}>
          <View style={[styles.light, state.connection === 'connected' && styles.lightOn]} />
          <Text style={styles.statusText} accessibilityLiveRegion="polite">
            {connection}
          </Text>
        </View>
      </View>
      <Text style={styles.soon}>{t('home.soon')}</Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: space.lg,
    gap: space.sm,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  address: { fontFamily: fonts.mark, fontSize: 14, lineHeight: 21, color: colors.slate },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  light: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.oat },
  lightOn: { backgroundColor: colors.clay },
  statusText: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary },
  soon: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: space.xl,
  },
});
