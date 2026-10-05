import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { isDirectoryPart } from '@tero/protocol';
import { colors, fonts, radii, space } from '@tero/ui';
import { Page } from '@/components/Page';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BoneRow } from '@/components/Skeleton';
import { Directory } from '@/components/Directory';
import { Jobs } from '@/components/Jobs';
import { Journeys } from '@/components/Journeys';
import { Skills } from '@/components/Skills';
import { Stories } from '@/components/Stories';
import { MutualAid } from '@/components/MutualAid';
import { SoonNote } from '@/components/SoonNote';
import { useLocale } from '@/lib/locale';
import { allParts, partKind, type PartKind } from '@/lib/areas';

/** Kinds of part that work for real; the rest still show placeholders. */
const built: PartKind[] = ['directory', 'aid', 'jobs', 'stories', 'skills', 'journeys'];

export function generateStaticParams() {
  return allParts.map((part) => ({ part }));
}

/** One part of an area of help, laid out for what it holds. Parts not built yet show placeholders. */
export default function PartScreen() {
  const { t } = useLocale();
  const { part: param, create } = useLocalSearchParams<{ part: string; create?: string }>();
  // Opened from Help's "Share or ask": go straight to the form.
  const creating = create !== undefined;
  const part = allParts.find((p) => p === param) ?? allParts[0]!;
  const kind = partKind[part] ?? 'list';
  return (
    <Page>
      <ScreenHeader title={t(`part.${part}` as MessageKey)} />
      <Text style={styles.lead}>{t(`part.${part}.body` as MessageKey)}</Text>
      {isDirectoryPart(part) && <Directory part={part} create={creating} />}
      {kind === 'aid' && (
        <MutualAid create={create === 'offer' ? 'offer' : creating ? 'request' : undefined} />
      )}
      {kind === 'jobs' && <Jobs create={creating} />}
      {kind === 'stories' && <Stories create={creating} />}
      {kind === 'skills' && <Skills create={creating} />}
      {kind === 'showCard' && <ShowCard />}
      {kind === 'journeys' && <Journeys create={creating} />}
      {kind === 'list' && <BoneList />}
      {!built.includes(kind) && <SoonNote text={t('part.soon')} />}
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
  list: {
    marginTop: space.md,
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
});
