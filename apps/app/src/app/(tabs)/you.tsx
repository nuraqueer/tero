import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { localeNames } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Code } from '@/components/Code';
import { CardAvatar } from '@/components/CardAvatar';
import { useCardTitle } from '@/components/MemberCard';
import { Page } from '@/components/Page';
import { TabHeader } from '@/components/TabHeader';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';

const pollMs = 4000;

/** Your card, then a short list of what's yours, as in the You mockup. */
export default function You() {
  const { t, locale } = useLocale();
  const session = useFullSession();
  const [openCards, setOpenCards] = useState<number | null>(null);
  const cardTitle = useCardTitle(session?.arcana ?? 0);

  const member = session?.member;
  const connected = session?.connection === 'connected';
  const api = session?.api;
  const refreshMember = session?.refreshMember;

  // While waiting to be let in, keep asking.
  useEffect(() => {
    if (member !== false || !connected || !refreshMember) return;
    const timer = setInterval(refreshMember, pollMs);
    return () => clearInterval(timer);
  }, [member, connected, refreshMember]);

  // How many cards are out, for the row's count.
  useFocusEffect(
    useCallback(() => {
      if (!member || !connected || !api) return;
      api()
        ?.listCards()
        .then((list) => setOpenCards(list.length))
        .catch(() => undefined);
    }, [member, connected, api]),
  );

  if (!session) return null;

  const connection = {
    connecting: t('home.connecting'),
    connected: t('home.connected'),
    offline: t('home.offline'),
  }[session.connection];

  const rows: Array<{ label: string; value?: string; href: Href; show: boolean }> = [
    {
      label: t('home.cards.title'),
      value: openCards ? String(openCards) : undefined,
      href: '/cards',
      show: member === true,
    },
    { label: t('words.open'), href: '/words', show: true },
    // Moderators work on phones; the Fool and council see it too until moderators exist.
    {
      label: t('mod.title'),
      href: '/moderation',
      show: session.role === 'fool' || session.role === 'council',
    },
    { label: t('welcome.language'), value: localeNames[locale], href: '/language', show: true },
  ];

  return (
    <Page tabs>
      <TabHeader
        title={t('tabs.you')}
        right={<Button label={t('home.lock')} onPress={session.lock} kind="secondary" />}
      />

      {member && session.arcana !== null && (
        <Pressable
          accessibilityRole="button"
          accessibilityHint={t('myCard.reveal')}
          onPress={() => router.push('/my-card')}
          style={({ pressed }) => [styles.me, pressed && styles.pressed]}
        >
          <CardAvatar size={64} />
          <View style={styles.meText}>
            <Text style={styles.meName}>{cardTitle}</Text>
            <Text style={styles.meSub}>
              {session.sequence !== null &&
                `${t('home.sequence', { sequence: session.sequence })} · `}
              {t('myCard.reveal')}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      )}

      {member === false && session.join && (
        <View style={styles.section}>
          <Text style={styles.heading} accessibilityRole="header">
            {t('home.waiting.title')}
          </Text>
          <Text style={styles.body}>{t('home.waiting.body')}</Text>
          <View style={styles.code}>
            <Code code={session.join.code} />
          </View>
        </View>
      )}

      {member === false && !session.join && <Text style={styles.body}>{t('home.notMember')}</Text>}

      <View style={styles.list}>
        {rows
          .filter((row) => row.show)
          .map((row, i) => (
            <Pressable
              key={row.label}
              accessibilityRole="button"
              onPress={() => router.push(row.href)}
              style={({ pressed }) => [
                styles.row,
                i > 0 && styles.divider,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.rowLabel}>{row.label}</Text>
              {row.value !== undefined && <Text style={styles.rowValue}>{row.value}</Text>}
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
      </View>

      <View style={styles.foot}>
        <View style={styles.status}>
          <View style={[styles.light, connected && styles.lightOn]} />
          <Text style={styles.statusText} accessibilityLiveRegion="polite">
            {connection}
          </Text>
        </View>
        <Text style={styles.address} selectable accessibilityLabel={t('home.address')}>
          {session.identity.did}
        </Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  me: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radii.lg,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  meText: { flex: 1, gap: 2 },
  meName: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.slate },
  meSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  section: { marginTop: space.md, gap: space.sm + 4 },
  heading: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.slate },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    marginTop: space.sm,
  },
  code: { marginTop: space.md },
  list: {
    marginTop: space.lg,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 4,
    minHeight: 50,
    paddingHorizontal: space.md,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(31,30,29,0.12)' },
  pressed: { backgroundColor: colors.oatLight },
  rowLabel: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.slate },
  rowValue: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  chevron: { fontFamily: fonts.body, fontSize: 22, color: '#9C9A92', marginTop: -2 },
  foot: { marginTop: space.lg, gap: space.xs, paddingHorizontal: space.xs },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  light: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.oat },
  lightOn: { backgroundColor: colors.clay },
  statusText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  address: { fontFamily: fonts.mark, fontSize: 11, lineHeight: 16, color: colors.textMuted },
});
