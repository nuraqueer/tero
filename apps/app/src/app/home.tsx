import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { bytesToBase64Url, cardIdFromToken, cardToken, randomBytes } from '@tero/crypto';
import { openCardLimit, type CardSummary } from '@tero/protocol';
import { colors, fonts, radii, space } from '@tero/ui';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Code } from '@/components/Code';
import { MemberCard } from '@/components/MemberCard';
import { Page } from '@/components/Page';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';
import { timeLeft } from '@/lib/time';

const pollMs = 4000;

export default function Home() {
  const { t } = useLocale();
  const session = useFullSession();
  const [cards, setCards] = useState<CardSummary[] | null>(null);
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);

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

  // Members see their live cards, refreshed while this screen is in front.
  useFocusEffect(
    useCallback(() => {
      if (!member || !connected || !api) return;
      let stopped = false;
      const load = () =>
        api()
          ?.listCards()
          .then((list) => !stopped && setCards(list))
          .catch(() => undefined);
      load();
      const timer = setInterval(load, pollMs);
      return () => {
        stopped = true;
        clearInterval(timer);
      };
    }, [member, connected, api]),
  );

  if (!session) return null;

  const connection = {
    connecting: t('home.connecting'),
    connected: t('home.connected'),
    offline: t('home.offline'),
  }[session.connection];

  const atLimit =
    cards !== null && session.sequence !== null && cards.length >= openCardLimit(session.sequence);

  const makeCard = async () => {
    const client = session.api();
    if (!client) return;
    setBusy(true);
    setProblem(undefined);
    try {
      const nonce = randomBytes(16);
      const id = cardIdFromToken(cardToken(session.cardSecret, nonce));
      await client.createCard({ id, nonce: bytesToBase64Url(nonce), type: 'member' });
      router.push({ pathname: '/card/[id]', params: { id } });
    } catch {
      setProblem(t('card.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <AppHeader />
      {member && session.sequence !== null && (
        <View style={styles.memberCard}>
          <MemberCard sequence={session.sequence} />
        </View>
      )}
      <View style={styles.panel}>
        <Text style={styles.label}>{t('home.address')}</Text>
        <Text style={styles.address} selectable>
          {session.identity.did}
        </Text>
        <View style={styles.status}>
          <View style={[styles.light, connected && styles.lightOn]} />
          <Text style={styles.statusText} accessibilityLiveRegion="polite">
            {connection}
            {session.sequence !== null &&
              ` · ${t('home.sequence', { sequence: session.sequence })}`}
          </Text>
        </View>
      </View>

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

      {member && (
        <View style={styles.section}>
          <Text style={styles.heading} accessibilityRole="header">
            {t('home.cards.title')}
          </Text>
          {cards?.map((card) => (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/card/[id]', params: { id: card.id } })}
              style={({ pressed }) => [styles.cardRow, pressed && styles.pressed]}
            >
              <Text style={styles.cardRowText}>
                {card.state === 'claimed'
                  ? t('home.cards.claimed')
                  : t('home.cards.open', { time: timeLeft(t, card.expiresAt) })}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
          {atLimit ? (
            <Text style={styles.body}>{t('home.cards.limit')}</Text>
          ) : (
            <Button label={t('home.cards.make')} onPress={makeCard} disabled={busy || !connected} />
          )}
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {problem ?? ''}
          </Text>
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  memberCard: { marginBottom: space.xl },
  panel: {
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
  section: { marginTop: space.xl, gap: space.sm + 4 },
  heading: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.slate },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    marginTop: space.md,
  },
  code: { marginTop: space.md },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  pressed: { opacity: 0.75 },
  cardRowText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.slate },
  chevron: { fontFamily: fonts.body, fontSize: 24, color: colors.textMuted },
  error: { minHeight: 22, fontFamily: fonts.body, fontSize: 15, color: colors.clayText },
});
