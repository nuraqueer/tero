import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Page } from '@/components/Page';
import { SuitIcon, suits, type Suit } from '@/components/SuitIcon';
import { useLocale } from '@/lib/locale';

/** What lives in each suit (docs/design.md). Each part opens as its milestone lands. */
const parts: Record<Suit, string[]> = {
  cups: ['support', 'listen'],
  pentacles: ['opportunities', 'aid'],
  swords: ['resources', 'showCard'],
  wands: ['journeys', 'courses'],
};

export function generateStaticParams() {
  return suits.map((suit) => ({ suit }));
}

export default function SuitScreen() {
  const { t } = useLocale();
  const { suit: param } = useLocalSearchParams<{ suit: string }>();
  const suit = suits.find((s) => s === param) ?? 'cups';
  return (
    <Page>
      <View style={styles.head}>
        <View style={styles.badge}>
          <SuitIcon suit={suit} size={36} color={colors.clayText} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {t(`suit.${suit}` as MessageKey)}
        </Text>
        <Text style={styles.sub}>{t(`suit.${suit}.sub` as MessageKey)}</Text>
      </View>
      <View style={styles.list}>
        {parts[suit].map((part, i) => (
          <Pressable
            key={part}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/part/[part]', params: { part } })}
            style={({ pressed }) => [
              styles.row,
              i > 0 && styles.divider,
              pressed && styles.pressed,
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
      <View style={styles.actions}>
        <Button label={t('setup.back')} onPress={() => router.back()} kind="quiet" />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: space.sm, marginTop: space.md },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.oatLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.slate },
  sub: { fontFamily: fonts.body, fontSize: 16, color: colors.textSecondary },
  list: {
    marginTop: space.xl,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.slate },
  rowBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  chevron: { fontFamily: fonts.body, fontSize: 22, color: colors.textMuted },
  pressed: { backgroundColor: colors.oatLight },
  actions: { marginTop: space.lg },
});
