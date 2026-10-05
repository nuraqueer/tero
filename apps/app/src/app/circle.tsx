import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { InputBar } from '@/components/InputBar';
import { Page } from '@/components/Page';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BoneBubble } from '@/components/Skeleton';
import { SoonNote } from '@/components/SoonNote';
import { useLocale } from '@/lib/locale';

const topics = ['all', 'help', 'events', 'resources'] as const;

/** A Circle: one calm conversation, topics as pills, a live Space floating on top. */
export default function Circle() {
  const { t } = useLocale();
  const [topic, setTopic] = useState<(typeof topics)[number]>('all');
  return (
    <Page>
      <ScreenHeader title={t('circle.title')} sub={t('circle.sub')} />
      <View style={styles.pills}>
        {topics.map((name) => (
          <Pressable
            key={name}
            accessibilityRole="radio"
            accessibilityState={{ selected: name === topic }}
            onPress={() => setTopic(name)}
            style={[styles.pill, name === topic && styles.pillOn]}
          >
            <Text style={[styles.pillText, name === topic && styles.pillTextOn]}>
              {t(`circle.topic.${name}` as MessageKey)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/space')}
        style={({ pressed }) => [styles.live, pressed && styles.pressed]}
      >
        <View style={styles.dot} />
        <Text style={styles.liveText}>{t('circle.live')}</Text>
        <Text style={styles.join}>{t('circle.join')}</Text>
      </Pressable>
      <View style={styles.thread}>
        <BoneBubble width="70%" />
        <BoneBubble width="52%" />
        <BoneBubble mine width="60%" />
        <BoneBubble width="66%" />
      </View>
      <SoonNote text={t('circle.soon')} />
      <InputBar placeholder={t('circle.message')} />
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
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    marginTop: space.md,
    paddingVertical: 12,
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  pressed: { opacity: 0.7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.clay },
  liveText: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.slate },
  join: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.clayText },
  thread: { gap: space.sm + 2, marginTop: space.lg },
});
