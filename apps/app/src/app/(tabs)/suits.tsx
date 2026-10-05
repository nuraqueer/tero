import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { Page } from '@/components/Page';
import { SuitIcon, suits } from '@/components/SuitIcon';
import { TabHeader } from '@/components/TabHeader';
import { useLocale } from '@/lib/locale';
import { suitParts } from '@/lib/suits';

/** Help, in four kinds: each suit a short menu of what it holds. */
export default function Suits() {
  const { t } = useLocale();
  const quick: Array<{ title: MessageKey; body: MessageKey; href: Href; strong?: boolean }> = [
    { title: 'suits.crisis.title', body: 'suits.crisis.body', href: '/crisis', strong: true },
    { title: 'suits.map.title', body: 'suits.map.body', href: '/map' },
  ];
  return (
    <Page tabs>
      <TabHeader title={t('tabs.suits')} right={t('suits.tagline')} />
      <View style={styles.quick}>
        {quick.map((q) => (
          <Pressable
            key={q.title}
            accessibilityRole="button"
            onPress={() => router.push(q.href)}
            style={({ pressed }) => [
              styles.quickCard,
              q.strong && styles.quickStrong,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.quickTitle, q.strong && styles.quickTitleStrong]}>
              {t(q.title)}
            </Text>
            <Text style={[styles.quickBody, q.strong && styles.quickBodyStrong]}>{t(q.body)}</Text>
          </Pressable>
        ))}
      </View>
      {suits.map((suit) => (
        <View key={suit} style={styles.group}>
          <View style={styles.groupHead}>
            <View style={styles.icon}>
              <SuitIcon suit={suit} size={20} color={colors.clayText} />
            </View>
            <Text style={styles.groupTitle} accessibilityRole="header">
              {t(`suit.${suit}` as MessageKey)}
            </Text>
            <Text style={styles.groupSub}>{t(`suit.${suit}.sub` as MessageKey)}</Text>
          </View>
          <View style={styles.list}>
            {suitParts[suit].map((part, i) => (
              <Pressable
                key={part}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/part/[part]', params: { part } })}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && styles.divider,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{t(`suit.part.${part}` as MessageKey)}</Text>
                  <Text style={styles.rowBody}>{t(`suit.part.${part}.body` as MessageKey)}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', gap: space.sm + 4 },
  quickCard: {
    flex: 1,
    gap: 2,
    padding: space.md,
    borderRadius: radii.lg,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  quickStrong: { backgroundColor: colors.slate, borderColor: colors.slate },
  pressed: { opacity: 0.8 },
  quickTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.slate },
  quickTitleStrong: { color: colors.ivory },
  quickBody: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  quickBodyStrong: { color: '#C9C6BD' },
  group: { marginTop: space.lg },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.oatLight,
  },
  groupTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.slate },
  groupSub: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  list: {
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(31,30,29,0.1)' },
  rowPressed: { backgroundColor: colors.oatLight },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.slate },
  rowBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  chevron: { fontFamily: fonts.body, fontSize: 22, color: colors.textMuted },
});
