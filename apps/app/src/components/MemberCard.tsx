import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts } from '@tero/ui';
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

const star = (x: number, y: number, r: number) => {
  const k = r * 0.28;
  return `M${x} ${y - r}L${x + k} ${y - k}L${x + r} ${y}L${x + k} ${y + k}L${x} ${y + r}L${x - k} ${y + k}L${x - r} ${y}L${x - k} ${y - k}Z`;
};

/** Tero's own card art, shared by every card: a sun ringed by rays over the gray fog. */
export function SunArt({ width }: { width: number }) {
  return (
    <Svg width={width} height={(width * 190) / 150} viewBox="0 0 150 190">
      <Circle cx={75} cy={88} r={44} fill="none" stroke={colors.gold} strokeWidth={1} />
      <Circle cx={75} cy={88} r={30} fill="none" stroke={colors.gold} strokeWidth={1} />
      <Path
        d="M75 30v10M75 136v10M17 88h10M123 88h10M34 47l7 7M109 122l7 7M34 129l7-7M109 54l7-7M75 22v4M75 150v4M9 88h4M137 88h4"
        stroke={colors.gold}
        strokeWidth={1}
        strokeLinecap="round"
      />
      <Path
        d="M88 66a24 24 0 1 0 0 44 19 19 0 0 1 0-44z"
        fill={colors.gold}
        fillOpacity={0.12}
        stroke={colors.gold}
        strokeWidth={1}
      />
      <Path d={star(75, 88, 8)} fill={colors.goldLight} />
      <Path d={star(30, 24.5, 4.5)} fill={colors.gold} />
      <Path d={star(122, 154.5, 4.5)} fill={colors.gold} />
      <Circle cx={124} cy={24} r={1.4} fill={colors.gold} />
      <Circle cx={24} cy={156} r={1.4} fill={colors.gold} />
      <Path
        d="M40 176c10-6 20-6 35 0s25 6 35 0"
        fill="none"
        stroke={colors.gold}
        strokeWidth={1}
        strokeLinecap="round"
      />
    </Svg>
  );
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
    <TeroCard width={width} bare>
      <Text style={[styles.numeral, { fontSize: 17 * k }]}>{toRoman(arcana)}</Text>
      <SunArt width={width * 0.72} />
      <View style={[styles.foot, { paddingTop: 8 * k }]}>
        <Text
          style={[styles.title, { fontSize: 14 * k, letterSpacing: 3 * k }]}
          accessibilityRole="header"
        >
          {title.toUpperCase()}
        </Text>
        {sequence !== null && (
          <Text style={[styles.sequence, { fontSize: 9 * k, letterSpacing: 1.6 * k }]}>
            {t('home.sequence', { sequence }).toUpperCase()}
          </Text>
        )}
      </View>
    </TeroCard>
  );
}

const styles = StyleSheet.create({
  numeral: { fontFamily: fonts.card, fontSize: 17, letterSpacing: 2, color: colors.goldLight },
  foot: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 2,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(201,162,126,0.55)',
  },
  title: {
    fontFamily: fonts.card,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.oatLight,
    textAlign: 'center',
  },
  sequence: { fontFamily: fonts.body, fontSize: 9, letterSpacing: 1.6, color: colors.gold },
});
