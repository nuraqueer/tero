import { StyleSheet, Text, View } from 'react-native';
import type { MessageKey } from '@tero/i18n';
import { fonts, tarot } from '@tero/ui';
import { useLocale } from '@/lib/locale';
import { ArcanaArt } from './ArcanaArt';
import { TarotFrame } from './TarotFrame';

const romans: [number, string][] = [
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

/** The member's own tarot card: number, art, name and Sequence. */
export function MemberCard({
  arcana,
  sequence,
  width = 200,
}: {
  arcana: number;
  sequence: number | null;
  width?: number;
}) {
  const { t } = useLocale();
  const title = useCardTitle(arcana);
  // Everything is drawn for a 200-wide card and grows with it.
  const k = width / 200;
  return (
    <View style={[styles.card, { width, height: width * tarot.ratio, borderRadius: 8 * k }]}>
      <TarotFrame width={width} />
      <View style={[styles.layout, { paddingVertical: 29 * k, paddingHorizontal: 25 * k }]}>
        <Text style={[styles.numeral, { fontSize: 13 * k }]}>{toRoman(arcana)}</Text>
        <ArcanaArt arcana={arcana} width={width * 0.64} />
        <View style={styles.foot}>
          <Text
            style={[styles.title, { fontSize: 11 * k, letterSpacing: 1.5 * k }]}
            accessibilityRole="header"
          >
            {title.toUpperCase()}
          </Text>
          {sequence !== null && (
            <Text style={[styles.sequence, { fontSize: 8 * k }]}>
              {t('home.sequence', { sequence })}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    backgroundColor: tarot.paper,
    shadowColor: '#38141E',
    shadowOpacity: 0.13,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  layout: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  numeral: { fontFamily: fonts.card, letterSpacing: 1, color: tarot.ink },
  foot: { alignSelf: 'stretch', alignItems: 'center', gap: 4 },
  title: { fontFamily: fonts.card, color: tarot.ink, textAlign: 'center' },
  sequence: { fontFamily: fonts.body, color: tarot.ink, textAlign: 'center', opacity: 0.75 },
});
