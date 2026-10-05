import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import type { StatusResponse } from '@tero/protocol';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Code } from '@/components/Code';
import { useCardTitle } from '@/components/MemberCard';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';

const greetings: Array<[number, MessageKey]> = [
  [5, 'console.evening'],
  [12, 'console.morning'],
  [18, 'console.afternoon'],
  [24, 'console.evening'],
];

/** The council's overview on the web, after the Council mockup. */
export default function Console() {
  const { t } = useLocale();
  const session = useFullSession();
  const title = useCardTitle(session?.arcana ?? 0);
  const [openCards, setOpenCards] = useState<number | null>(null);
  const [status, setStatus] = useState<(StatusResponse & { ms: number }) | 'down' | null>(null);
  const member = session?.member;
  const api = session?.api;
  const connected = session?.connection === 'connected';

  useFocusEffect(
    useCallback(() => {
      if (!member || !connected || !api) return;
      const client = api();
      client
        ?.listCards()
        .then((list) => setOpenCards(list.length))
        .catch(() => undefined);
      // Ask how the system is doing, and time the round trip.
      const check = () => {
        const started = Date.now();
        client
          ?.status()
          .then((s) => setStatus({ ...s, ms: Date.now() - started }))
          .catch(() => setStatus('down'));
      };
      check();
      const timer = setInterval(check, 30_000);
      return () => clearInterval(timer);
    }, [member, connected, api]),
  );

  if (!session) return null;
  const hour = new Date().getHours();
  const greeting = (greetings.find(([until]) => hour < until) ?? greetings[0]!)[1];

  if (member === false) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title} accessibilityRole="header">
          {t('home.waiting.title')}
        </Text>
        <Text style={styles.sub}>{t('home.waiting.body')}</Text>
        {session.join && (
          <View style={styles.code}>
            <Code code={session.join.code} />
          </View>
        )}
      </ScrollView>
    );
  }

  const stats = [
    { label: t('console.stat.cards'), value: openCards === null ? '–' : String(openCards) },
    {
      label: t('console.stat.sequence'),
      value: session.sequence === null ? '–' : String(session.sequence),
    },
  ];

  const later: Array<[MessageKey, MessageKey]> = [
    ['console.votes', 'console.votes.body'],
    ['console.verifications', 'console.verifications.body'],
    ['console.countries', 'console.countries.body'],
  ];

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.title} accessibilityRole="header">
        {t(greeting, { name: title })}
      </Text>
      <Text style={styles.sub}>{t('console.sub')}</Text>

      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={[styles.panel, styles.stat]}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.panel, styles.system]}>
        <Text style={styles.panelTitle}>{t('status.title')}</Text>
        {[
          {
            label: t('status.api'),
            ok: status !== 'down' && status !== null,
            value:
              status === 'down'
                ? t('status.down')
                : status
                  ? t('status.fast', { ms: status.ms })
                  : t('home.connecting'),
          },
          {
            label: t('status.registry'),
            ok: status !== 'down' && status !== null,
            value: status && status !== 'down' ? String(status.members) : '–',
          },
          {
            label: t('status.council'),
            ok: status !== 'down' && status !== null,
            value:
              status && status !== 'down'
                ? t('status.seats', { count: status.council, total: 22 })
                : '–',
          },
          {
            label: t('status.cards'),
            ok: status !== 'down' && status !== null,
            value: status && status !== 'down' ? String(status.openCards) : '–',
          },
        ].map((line) => (
          <View key={line.label} style={styles.statusRow}>
            <View style={[styles.light, line.ok ? styles.lightOn : styles.lightOff]} />
            <Text style={styles.statusLabel}>{line.label}</Text>
            <Text style={styles.statusValue}>{line.value}</Text>
          </View>
        ))}
      </View>

      {session.role === 'fool' && (
        <View style={[styles.panel, styles.seat]}>
          <View style={styles.seatText}>
            <Text style={styles.panelTitle}>{t('console.seatCard.title')}</Text>
            <Text style={styles.panelBody}>{t('console.seatCard.body')}</Text>
          </View>
          <Button
            label={t('console.seatCard.make')}
            onPress={() => router.navigate('/admin/cards')}
          />
        </View>
      )}

      <View style={styles.grid}>
        {later.map(([heading, body]) => (
          <View key={heading} style={[styles.panel, styles.cell]}>
            <View style={styles.cellHead}>
              <Text style={styles.panelTitle}>{t(heading)}</Text>
              <Text style={styles.soon}>{t('suit.soon')}</Text>
            </View>
            <Text style={styles.panelBody}>{t(body)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: space.xl,
    paddingTop: space.xl + space.md,
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.slate },
  sub: { fontFamily: fonts.body, fontSize: 16, color: colors.textSecondary, marginTop: space.xs },
  code: { marginTop: space.lg, alignSelf: 'flex-start' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.xl },
  panel: {
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: space.lg,
  },
  stat: { flexGrow: 1, flexBasis: 200, gap: space.sm },
  statLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  statValue: { fontFamily: fonts.display, fontSize: 32, color: colors.slate },
  seat: {
    marginTop: space.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.lg,
  },
  seatText: { flex: 1, minWidth: 260, gap: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md },
  cell: { flexGrow: 1, flexBasis: 280, gap: space.sm },
  cellHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  panelTitle: { fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.slate },
  panelBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  soon: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  system: { marginTop: space.md, gap: space.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, minHeight: 30 },
  light: { width: 8, height: 8, borderRadius: 4 },
  lightOn: { backgroundColor: '#3E8E5E' },
  lightOff: { backgroundColor: colors.clay },
  statusLabel: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.slate },
  statusValue: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
});
