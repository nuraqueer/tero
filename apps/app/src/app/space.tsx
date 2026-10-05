import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Page } from '@/components/Page';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Bone } from '@/components/Skeleton';
import { SoonNote } from '@/components/SoonNote';
import { useLocale } from '@/lib/locale';

/** A live Space: up to six speakers, any number listening, encrypted end to end (D26). */
export default function Space() {
  const { t } = useLocale();
  return (
    <Page>
      <ScreenHeader title={t('space.title')} sub={t('space.sub')} />
      <View style={styles.live}>
        <View style={styles.dot} />
        <Text style={styles.liveText}>{t('space.live')}</Text>
      </View>
      <Text style={styles.label}>{t('space.speakers')}</Text>
      <View style={styles.speakers}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={styles.speaker}>
            <Bone width={64} height={64} round />
            <Bone width={48} height={10} />
          </View>
        ))}
      </View>
      <Text style={styles.label}>{t('space.listening')}</Text>
      <View style={styles.listeners}>
        {Array.from({ length: 10 }, (_, i) => (
          <Bone key={i} width={36} height={36} round />
        ))}
      </View>
      <View style={styles.safety}>
        <Text style={styles.safetyTitle}>{t('space.signal.title')}</Text>
        <Text style={styles.safetyBody}>{t('space.signal.body')}</Text>
      </View>
      <View style={styles.actions}>
        <Button label={t('space.raise')} onPress={() => undefined} disabled />
        <Button label={t('space.leave')} onPress={() => undefined} kind="secondary" disabled />
      </View>
      <SoonNote text={t('space.soon')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  live: { flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.clay },
  liveText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.clayText,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    marginTop: space.lg,
    marginBottom: space.sm,
    textTransform: 'uppercase',
  },
  speakers: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, justifyContent: 'center' },
  speaker: { alignItems: 'center', gap: space.sm, width: 80 },
  listeners: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  safety: {
    marginTop: space.lg,
    padding: space.md,
    gap: 4,
    borderRadius: radii.md,
    backgroundColor: colors.oatLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.clay,
  },
  safetyTitle: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.slate },
  safetyBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  actions: { gap: space.sm, marginTop: space.lg },
});
