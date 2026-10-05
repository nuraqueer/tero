import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { Page } from '@/components/Page';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Bone, BoneRow } from '@/components/Skeleton';
import { SoonNote } from '@/components/SoonNote';
import { useLocale } from '@/lib/locale';

export const parts = [
  'support',
  'listen',
  'opportunities',
  'aid',
  'resources',
  'showCard',
  'journeys',
  'courses',
] as const;
type Part = (typeof parts)[number];

export function generateStaticParams() {
  return parts.map((part) => ({ part }));
}

/** One part of a suit. Each keeps its own layout from the mockups, with placeholders inside. */
export default function PartScreen() {
  const { t } = useLocale();
  const { part: param } = useLocalSearchParams<{ part: string }>();
  const part: Part = parts.find((p) => p === param) ?? 'support';
  return (
    <Page>
      <ScreenHeader title={t(`suit.part.${part}` as MessageKey)} />
      <Text style={styles.lead}>{t(`suit.part.${part}.body` as MessageKey)}</Text>
      {part === 'showCard' ? (
        <ShowCard />
      ) : part === 'journeys' ? (
        <Journey />
      ) : part === 'resources' ? (
        <Resources />
      ) : (
        <View style={styles.list}>
          {Array.from({ length: 5 }, (_, i) => (
            <BoneRow key={i} />
          ))}
        </View>
      )}
      <SoonNote text={t('part.soon')} />
    </Page>
  );
}

/** D36: three words that change every 30 seconds; the partner shows the same three back. */
function ShowCard() {
  const { t } = useLocale();
  const [left, setLeft] = useState(30);
  useEffect(() => {
    const timer = setInterval(() => setLeft((s) => (s <= 1 ? 30 : s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <View style={styles.cardWrap}>
      <View style={styles.wordCard}>
        <Text style={styles.wordLabel}>{t('public.partners.member')}</Text>
        {[0, 1, 2].map((i) => (
          <Text key={i} style={styles.word}>
            · · ·
          </Text>
        ))}
        <Text style={styles.wordLabel}>TERO</Text>
      </View>
      <Text style={styles.changes}>{t('card.changesIn', { seconds: left })}</Text>
      <Text style={styles.hint}>{t('part.showCard.hint')}</Text>
    </View>
  );
}

function Journey() {
  return (
    <View style={styles.steps}>
      {[1, 2, 3, 4, 5].map((n) => (
        <View key={n} style={styles.step}>
          <View style={[styles.stepDot, n === 1 && styles.stepDotOn]}>
            <Text style={[styles.stepNumber, n === 1 && styles.stepNumberOn]}>{n}</Text>
          </View>
          <View style={styles.stepLines}>
            <Bone width="55%" />
            <Bone width="85%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

function Resources() {
  const { t } = useLocale();
  const [kind, setKind] = useState(0);
  const kinds: MessageKey[] = [
    'part.resources.all',
    'part.resources.partners',
    'part.resources.unaware',
  ];
  return (
    <>
      <View style={styles.pills}>
        {kinds.map((key, i) => (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ selected: i === kind }}
            onPress={() => setKind(i)}
            style={[styles.pill, i === kind && styles.pillOn]}
          >
            <Text style={[styles.pillText, i === kind && styles.pillTextOn]}>{t(key)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.list}>
        {Array.from({ length: 4 }, (_, i) => (
          <BoneRow key={i} />
        ))}
      </View>
      <Text style={styles.hint}>{t('part.resources.unawareNote')}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.textSecondary },
  list: {
    marginTop: space.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  cardWrap: { alignItems: 'center', marginTop: space.xl, gap: space.md },
  wordCard: {
    width: 220,
    paddingVertical: space.xl,
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.slate,
  },
  wordLabel: { fontFamily: fonts.card, fontSize: 12, letterSpacing: 2, color: colors.gold },
  word: { fontFamily: fonts.card, fontSize: 22, letterSpacing: 3, color: colors.oatLight },
  changes: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: space.md,
  },
  steps: { marginTop: space.lg, gap: space.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.slate,
  },
  stepDotOn: { backgroundColor: colors.slate },
  stepNumber: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.slate },
  stepNumberOn: { color: colors.ivory },
  stepLines: { flex: 1, gap: space.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.lg },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(31,30,29,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(31,30,29,0.12)',
  },
  pillOn: { backgroundColor: colors.slate, borderColor: colors.slate },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate },
  pillTextOn: { color: colors.ivory },
});
