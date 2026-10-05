import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '@tero/ui';
import { useLocale } from '@/lib/locale';
import { TeroCard } from './TeroCard';

const romans: Array<[number, string]> = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

/** Sequences as tarot numbers. Sequence 0 is the Fool's card, numbered 0 as in the deck. */
export function toRoman(n: number): string {
  if (n === 0) return '0';
  let rest = n;
  let out = '';
  for (const [value, letters] of romans) {
    while (rest >= value) {
      out += letters;
      rest -= value;
    }
  }
  return out;
}

/** The card's name: "The Fool" for Sequence 0, otherwise the Sequence in tarot numbers. */
export function useCardTitle(sequence: number): string {
  const { t } = useLocale();
  return sequence === 0 ? t('card.fool') : t('home.sequence', { sequence: toRoman(sequence) });
}

/** The member's own tarot card: the Fool for Sequence 0, otherwise their Sequence. */
export function MemberCard({ sequence }: { sequence: number }) {
  const title = useCardTitle(sequence);
  return (
    <TeroCard width={200}>
      <Text style={styles.numeral}>{toRoman(sequence)}</Text>
      <Text style={styles.title} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
    </TeroCard>
  );
}

const styles = StyleSheet.create({
  numeral: { fontFamily: fonts.card, fontSize: 40, color: colors.goldLight },
  title: {
    fontFamily: fonts.card,
    fontSize: 17,
    letterSpacing: 3,
    color: colors.oatLight,
    textAlign: 'center',
  },
});
