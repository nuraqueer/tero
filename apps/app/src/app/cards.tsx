import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { bytesToBase64Url, cardIdFromToken, cardToken, randomBytes } from '@tero/crypto';
import { openCardLimit, type CardSummary } from '@tero/protocol';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Page } from '@/components/Page';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';
import { timeLeft } from '@/lib/time';

const pollMs = 4000;

/** The member's live Tero cards, and making a new one. */
export default function Cards() {
  const { t } = useLocale();
  const session = useFullSession();
  const [cards, setCards] = useState<CardSummary[] | null>(null);
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);
  const connected = session?.connection === 'connected';
  const api = session?.api;

  useFocusEffect(
    useCallback(() => {
      if (!connected || !api) return;
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
    }, [connected, api]),
  );

  if (!session) return null;

  const atLimit =
    cards !== null && session.sequence !== null && cards.length >= openCardLimit(session.sequence);

  const makeCard = async (type: 'member' | 'council' = 'member') => {
    const client = session.api();
    if (!client) return;
    setBusy(true);
    setProblem(undefined);
    try {
      const nonce = randomBytes(16);
      const id = cardIdFromToken(cardToken(session.cardSecret, nonce));
      await client.createCard({ id, nonce: bytesToBase64Url(nonce), type });
      router.push({ pathname: '/card/[id]', params: { id } });
    } catch {
      setProblem(t('card.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Text style={styles.title} accessibilityRole="header">
        {t('home.cards.title')}
      </Text>
      <Text style={styles.body}>{t('cards.body')}</Text>
      {cards !== null && cards.length > 0 && (
        <View style={styles.list}>
          {cards.map((card, i) => (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/card/[id]', params: { id: card.id } })}
              style={({ pressed }) => [
                styles.row,
                i > 0 && styles.divider,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.rowText}>
                {card.type === 'council' && `${t('console.councilCard')} · `}
                {card.state === 'claimed'
                  ? t('home.cards.claimed')
                  : t('home.cards.open', { time: timeLeft(t, card.expiresAt) })}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.actions}>
        {atLimit ? (
          <Text style={styles.body}>{t('home.cards.limit')}</Text>
        ) : (
          <Button
            label={t('home.cards.make')}
            onPress={() => makeCard()}
            disabled={busy || !connected}
          />
        )}
        {session.role === 'fool' && (
          <Button
            label={t('console.seatCard.make')}
            onPress={() => makeCard('council')}
            kind="secondary"
            disabled={busy || !connected}
          />
        )}
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {problem ?? ''}
        </Text>
        <Button label={t('setup.back')} onPress={() => router.back()} kind="quiet" />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.slate },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    marginTop: space.sm,
  },
  list: {
    marginTop: space.lg,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  pressed: { backgroundColor: colors.oatLight },
  rowText: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.slate },
  chevron: { fontFamily: fonts.body, fontSize: 22, color: colors.textMuted },
  actions: { marginTop: space.xl, gap: space.sm },
  error: { minHeight: 22, fontFamily: fonts.body, fontSize: 15, color: colors.clayText },
});
