import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, space } from '@tero/ui';
import { toRoman } from '@/components/MemberCard';
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
        {suits.map((suit, i) => (
          <Pressable
            key={suit}
            accessibilityRole="button"
            accessibilityLabel={`${t(`suit.${suit}` as MessageKey)}, ${t(`suit.${suit}.sub` as MessageKey)}`}
            onPress={() => router.push({ pathname: '/suit/[suit]', params: { suit } })}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.inner}>
              <Text style={styles.number}>{toRoman(i + 1)}</Text>
              <SuitIcon suit={suit} />
              <View style={styles.names}>
                <Text style={styles.name}>{t(`suit.${suit}` as MessageKey).toUpperCase()}</Text>
                <Text style={styles.sub}>{t(`suit.${suit}.sub` as MessageKey)}</Text>
              </View>
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
    height: 196,
    borderRadius: 12,
    backgroundColor: colors.slate,
    padding: 5,
    shadowColor: colors.slate,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  pressed: { transform: [{ translateY: -2 }], opacity: 0.92 },
  inner: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 9,
    paddingHorizontal: space.sm,
  },
  number: {
    alignSelf: 'flex-start',
    fontFamily: fonts.card,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.gold,
  },
  names: { alignItems: 'center' },
  name: { fontFamily: fonts.card, fontSize: 15, letterSpacing: 2.4, color: colors.oatLight },
  sub: { fontFamily: fonts.body, fontSize: 11, color: '#B0AEA5', marginTop: 3 },
});
