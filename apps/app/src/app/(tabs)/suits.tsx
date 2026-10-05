import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { Page } from '@/components/Page';
import { SuitIcon, suits } from '@/components/SuitIcon';
import { TabHeader } from '@/components/TabHeader';
import { useLocale } from '@/lib/locale';

/** Help, in four kinds: a card for each suit. */
export default function Suits() {
  const { t } = useLocale();
  return (
    <Page tabs>
      <TabHeader title={t('tabs.suits')} right={t('suits.tagline')} />
      <View style={styles.grid}>
        {suits.map((suit) => (
          <Pressable
            key={suit}
            accessibilityRole="button"
            accessibilityLabel={`${t(`suit.${suit}` as MessageKey)}, ${t(`suit.${suit}.sub` as MessageKey)}`}
            onPress={() => router.push({ pathname: '/suit/[suit]', params: { suit } })}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.icon}>
              <SuitIcon suit={suit} size={30} color={colors.clayText} />
            </View>
            <View style={styles.names}>
              <Text style={styles.name}>{t(`suit.${suit}` as MessageKey)}</Text>
              <Text style={styles.sub}>{t(`suit.${suit}.sub` as MessageKey)}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47.5%',
    flexGrow: 1,
    minHeight: 150,
    justifyContent: 'space-between',
    padding: space.md,
    borderRadius: radii.lg,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.oatLight },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.oatLight,
  },
  names: { gap: 2, marginTop: space.md },
  name: { fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.slate },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
});
