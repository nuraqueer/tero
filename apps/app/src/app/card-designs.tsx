import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, fonts } from '@tero/ui';
import { CardBack } from '@/components/CardBack';
import { MemberCard } from '@/components/MemberCard';
import { Page } from '@/components/Page';
import { ScreenHeader } from '@/components/ScreenHeader';

/** Development gallery only; never assigns a card or alters an account. */
export default function CardDesigns() {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(180, (Math.min(width, 520) - 64) / 2);
  return (
    <Page>
      <ScreenHeader title="Tarot design study" />
      <Text style={styles.note}>
        First ten Major Arcana · 0–IX. Distinct symbols, dark charcoal and gold. Other card
        designs are still to come.
      </Text>
      <View style={styles.grid}>
        {Array.from({ length: 10 }, (_, arcana) => (
          <MemberCard key={arcana} arcana={arcana} sequence={null} width={cardWidth} />
        ))}
        <View style={{ alignItems: 'center', gap: 12 }}>
          <CardBack width={cardWidth} />
          <Text style={styles.note}>Shared charcoal-and-gold back</Text>
        </View>
      </View>
    </Page>
  );
}
const styles = StyleSheet.create({
  note: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
});
