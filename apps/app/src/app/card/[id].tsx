import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { base64UrlToBytes, cardCode, cardIdFromToken, cardToken } from '@tero/crypto';
import { cardUrl, type CardSummary } from '@tero/protocol';
import { colors, fonts, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { Code } from '@/components/Code';
import { Page } from '@/components/Page';
import { QrCode } from '@/components/QrCode';
import { TeroCard } from '@/components/TeroCard';
import { publicOrigin } from '@/lib/api';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';
import { timeLeft } from '@/lib/time';

const pollMs = 2500;

type View_ =
  | { name: 'loading' }
  | { name: 'card'; card: CardSummary }
  | { name: 'approved' }
  | { name: 'gone' };

export default function CardScreen() {
  const { t } = useLocale();
  const session = useFullSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [view, setView] = useState<View_>({ name: 'loading' });
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const api = session?.api;

  // Follow the card until it is claimed, approved, destroyed or expired.
  useFocusEffect(
    useCallback(() => {
      if (!api) return;
      let stopped = false;
      const load = async () => {
        try {
          const cards = (await api()?.listCards()) ?? null;
          if (stopped || !cards) return;
          const card = cards.find((c) => c.id === id);
          setView((v) =>
            v.name === 'approved' ? v : card ? { name: 'card', card } : { name: 'gone' },
          );
        } catch {
          // Keep showing what we have; the next poll tries again.
        }
      };
      load();
      const timer = setInterval(load, pollMs);
      return () => {
        stopped = true;
        clearInterval(timer);
      };
    }, [api, id]),
  );

  if (!session) return null;

  const act = async (action: () => Promise<unknown> | undefined, next: View_) => {
    setBusy(true);
    setProblem(undefined);
    try {
      await action();
      setView(next);
    } catch {
      setProblem(t('card.failed'));
    } finally {
      setBusy(false);
    }
  };

  const destroy = () => act(() => session.api()?.destroyCard(id), { name: 'gone' });

  if (view.name === 'loading') return <Page>{null}</Page>;

  if (view.name === 'approved' || view.name === 'gone') {
    const approved = view.name === 'approved';
    return (
      <Page center>
        <Text style={styles.title} accessibilityRole="header">
          {approved ? t('card.approved.title') : t('card.gone')}
        </Text>
        {approved && <Text style={styles.body}>{t('card.approved.body')}</Text>}
        <View style={styles.actions}>
          <Button label={t('card.done')} onPress={() => router.back()} />
        </View>
      </Page>
    );
  }

  const { card } = view;

  if (card.state === 'claimed' && card.claimer) {
    const claimer = card.claimer;
    return (
      <Page>
        <Text style={styles.title} accessibilityRole="header">
          {t('card.claimed.title')}
        </Text>
        <Text style={styles.body}>{t('card.claimed.body')}</Text>
        <View style={styles.code}>
          <Code code={cardCode(card.id, claimer)} />
        </View>
        <View style={styles.actions}>
          <Checkbox label={t('card.adult')} checked={adult} onChange={setAdult} />
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {problem ?? ''}
          </Text>
          <Button
            label={t('card.approve')}
            onPress={() =>
              act(() => session.api()?.approveCard(card.id, claimer), { name: 'approved' })
            }
            disabled={!adult || busy}
          />
          <Button label={t('card.mismatch')} onPress={destroy} kind="secondary" disabled={busy} />
        </View>
      </Page>
    );
  }

  // Make the token again from this phone's card secret; the server never had it.
  const nonce = base64UrlToBytes(card.nonce);
  const token = nonce ? cardToken(session.cardSecret, nonce) : null;
  const ours = token !== null && cardIdFromToken(token) === card.id;

  return (
    <Page>
      <Text style={styles.title} accessibilityRole="header">
        {t('card.title')}
      </Text>
      <Text style={styles.body}>{t('card.show')}</Text>
      <View style={styles.cardWrap}>
        <TeroCard>
          {ours && (
            <View style={styles.qr}>
              <QrCode value={cardUrl(publicOrigin(), token)} size={196} label={t('card.qrLabel')} />
            </View>
          )}
        </TeroCard>
      </View>
      <Text style={styles.expiry}>
        {t('home.cards.open', { time: timeLeft(t, card.expiresAt) })}
      </Text>
      <Text style={styles.error} accessibilityLiveRegion="polite">
        {problem ?? ''}
      </Text>
      <View style={styles.actions}>
        <Button label={t('card.destroy')} onPress={destroy} kind="secondary" disabled={busy} />
        <Button label={t('setup.back')} onPress={() => router.back()} kind="quiet" />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
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
  cardWrap: { marginTop: space.lg },
  qr: { borderRadius: 6, overflow: 'hidden' },
  expiry: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: space.lg,
  },
  code: { marginTop: space.xl },
  actions: { gap: space.sm + 4, marginTop: space.lg },
  error: {
    minHeight: 22,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.clayText,
    textAlign: 'center',
  },
});
