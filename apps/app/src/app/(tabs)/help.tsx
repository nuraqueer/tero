import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { Page } from '@/components/Page';
import { AreaIcon, areas } from '@/components/AreaIcon';
import { TabHeader } from '@/components/TabHeader';
import { useLocale } from '@/lib/locale';
import { areaParts } from '@/lib/areas';

/** Help, in four kinds: each area a short menu of what it holds. */
export default function Help() {
  const { t } = useLocale();
  const quick: Array<{ title: MessageKey; body: MessageKey; href: Href; strong?: boolean }> = [
    { title: 'help.crisis.title', body: 'help.crisis.body', href: '/crisis', strong: true },
    { title: 'help.map.title', body: 'help.map.body', href: '/map' },
  ];
  return (
    <Page tabs>
      <TabHeader title={t('tabs.help')} right={t('help.tagline')} />
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
      {areas.map((area) => (
        <View key={area} style={styles.group}>
          <View style={styles.groupHead}>
            <View style={styles.icon}>
              <AreaIcon area={area} size={20} color={colors.clayText} />
            </View>
            <Text style={styles.groupTitle} accessibilityRole="header">
              {t(`area.${area}` as MessageKey)}
            </Text>
          </View>
          <View style={styles.list}>
            {areaParts[area].map((part, i) => (
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
                  <Text style={styles.rowTitle}>{t(`part.${part}` as MessageKey)}</Text>
                  <Text style={styles.rowBody}>{t(`part.${part}.body` as MessageKey)}</Text>
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
