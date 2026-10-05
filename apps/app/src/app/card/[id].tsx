import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import { CardName } from '@/components/CardName';
import { publicOrigin } from '@/lib/api';
import { saveCardImage, shareCardImage } from '@/lib/card-image';
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
  const [full, setFull] = useState(false);
  const [note, setNote] = useState<string>();
  const cardView = useRef<View>(null);
  const { width, height } = useWindowDimensions();
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

  // Sharing and saving: closing the share sheet without choosing isn't a failure.
  const run = async (action: () => Promise<unknown>) => {
    setProblem(undefined);
    setNote(undefined);
    try {
      await action();
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setProblem(t('card.shareFailed'));
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('card.fullScreen')}
        onPress={() => setFull(true)}
        style={styles.cardWrap}
      >
        {/* A plain wrapper so the picture taken for sharing is just the card. */}
        <View ref={cardView} collapsable={false} style={styles.shot}>
          <TeroCard>
            {ours && (
              <View style={styles.qr}>
                <QrCode
                  value={cardUrl(publicOrigin(), token)}
                  size={196}
                  label={t('card.qrLabel')}
                />
              </View>
            )}
            <CardName arcana={card.arcana} />
          </TeroCard>
        </View>
      </Pressable>
      <Text style={styles.expiry}>
        {t('home.cards.open', { time: timeLeft(t, card.expiresAt) })}
      </Text>
      <View style={styles.shareRow}>
        <Button label={t('card.fullScreen')} onPress={() => setFull(true)} kind="secondary" />
        <Button
          label={t('card.share')}
          onPress={() => run(() => shareCardImage(cardView, t('card.title')))}
          kind="secondary"
          disabled={!ours}
        />
        <Button
          label={t('card.save')}
          onPress={() =>
            run(async () =>
              setNote((await saveCardImage(cardView)) ? t('card.saved') : t('card.saveDenied')),
            )
          }
          kind="secondary"
          disabled={!ours}
        />
      </View>
      <Text style={styles.warning}>{t('card.shareWarning')}</Text>
      <Text style={styles.error} accessibilityLiveRegion="polite">
        {problem ?? note ?? ''}
      </Text>
      <Modal visible={full} animationType="fade" onRequestClose={() => setFull(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('card.done')}
          onPress={() => setFull(false)}
          style={styles.full}
        >
          <TeroCard width={Math.min(width - 32, (height - 120) / 1.55, 420)}>
            {ours && (
              <View style={styles.qr}>
                <QrCode
                  value={cardUrl(publicOrigin(), token)}
                  size={Math.min(width - 32, (height - 120) / 1.55, 420) * 0.78}
                  label={t('card.qrLabel')}
                />
              </View>
            )}
            <CardName arcana={card.arcana} />
          </TeroCard>
          <Text style={styles.fullHint}>{t('card.tapToClose')}</Text>
        </Pressable>
      </Modal>
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
  cardWrap: { marginTop: space.lg, alignSelf: 'center' },
  shot: { padding: 18, backgroundColor: colors.ivory },
  shareRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    justifyContent: 'center',
    marginTop: space.lg,
  },
  warning: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: space.md,
  },
  full: {
    flex: 1,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
  },
  fullHint: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
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
