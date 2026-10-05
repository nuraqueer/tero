import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '@tero/ui';
import type { MessageKey } from '@tero/i18n';
import { useLocale } from '@/lib/locale';
import { TeroCard } from './TeroCard';

const romans: Array<[number, string]> = [
  [20, 'XX'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

/** Tarot numbers. The Fool's card is numbered 0, as in the deck. */
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

/** A Major Arcana card's name, such as "The Fool" or "Justice". */
export function useCardTitle(arcana: number): string {
  const { t } = useLocale();
  return t(`arcana.${arcana}` as MessageKey);
}

/** The member's own tarot card, numbered as in the deck. */
export function MemberCard({ arcana }: { arcana: number }) {
  const title = useCardTitle(arcana);
  return (
    <TeroCard width={200}>
      <Text style={styles.numeral}>{toRoman(arcana)}</Text>
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
