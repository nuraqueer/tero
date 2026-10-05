import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { isDirectoryPart } from '@tero/protocol';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Page } from '@/components/Page';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Bone, BoneRow } from '@/components/Skeleton';
import { Directory } from '@/components/Directory';
import { Jobs } from '@/components/Jobs';
import { MutualAid } from '@/components/MutualAid';
import { SoonNote } from '@/components/SoonNote';
import { useLocale } from '@/lib/locale';
import { allParts, partKind } from '@/lib/areas';

export function generateStaticParams() {
  return allParts.map((part) => ({ part }));
}

/** One part of an area of help, laid out for what it holds. Parts not built yet show placeholders. */
export default function PartScreen() {
  const { t } = useLocale();
  const { part: param } = useLocalSearchParams<{ part: string }>();
  const part = allParts.find((p) => p === param) ?? allParts[0]!;
  const kind = partKind[part] ?? 'list';
  return (
    <Page>
      <ScreenHeader title={t(`part.${part}` as MessageKey)} />
      <Text style={styles.lead}>{t(`part.${part}.body` as MessageKey)}</Text>
      {isDirectoryPart(part) && <Directory part={part} />}
      {kind === 'aid' && <MutualAid />}
      {kind === 'jobs' && <Jobs />}
      {kind === 'stories' && <Stories />}
      {kind === 'skills' && <Skills />}
      {kind === 'showCard' && <ShowCard />}
      {kind === 'journeys' && <Journey />}
      {kind === 'list' && <BoneList />}
      {!isDirectoryPart(part) && kind !== 'aid' && kind !== 'jobs' && (
        <SoonNote text={t('part.soon')} />
      )}
    </Page>
  );
}

function BoneList({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }, (_, i) => (
        <BoneRow key={i} />
      ))}
    </View>
  );
}

function Stories() {
  const { t } = useLocale();
  return (
    <>
      <View style={styles.callout}>
        <Text style={styles.calloutText}>{t('stories.note')}</Text>
      </View>
      <BoneList rows={3} />
      <View style={styles.actions}>
        <Button label={t('stories.share')} onPress={() => undefined} kind="secondary" disabled />
      </View>
    </>
  );
}

function Skills() {
  const { t } = useLocale();
  return (
    <>
      <View style={styles.actions}>
        <Button label={t('skills.readGuides')} onPress={() => router.push('/guides')} />
        <Button
          label={t('skills.contribute')}
          onPress={() => undefined}
          kind="secondary"
          disabled
        />
      </View>
      <BoneList rows={3} />
    </>
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
      <Text style={styles.note}>{t('part.showCard.hint')}</Text>
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

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.textSecondary },
  note: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: space.md,
    textAlign: 'center',
  },
  actions: { gap: space.sm, marginTop: space.lg },
  list: {
    marginTop: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  callout: {
    marginTop: space.lg,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.oatLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.clay,
  },
  calloutText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.slate },
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
});
