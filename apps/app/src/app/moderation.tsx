import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { Page } from '@/components/Page';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BoneRow } from '@/components/Skeleton';
import { SoonNote } from '@/components/SoonNote';
import { useLocale } from '@/lib/locale';

const queues: MessageKey[] = ['mod.reports', 'mod.escalated', 'mod.done'];

/** Moderators work on their phones (D40): reports to review, and what went to the council. */
export default function Moderation() {
  const { t } = useLocale();
  const [queue, setQueue] = useState(0);
  return (
    <Page>
      <ScreenHeader title={t('mod.title')} />
      <View style={styles.pills}>
        {queues.map((key, i) => (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ selected: i === queue }}
            onPress={() => setQueue(i)}
            style={[styles.pill, i === queue && styles.pillOn]}
          >
            <Text style={[styles.pillText, i === queue && styles.pillTextOn]}>{t(key)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.list}>
        {Array.from({ length: 5 }, (_, i) => (
          <BoneRow key={i} />
        ))}
      </View>
      <SoonNote text={t('mod.soon')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
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
  list: {
    marginTop: space.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
});
