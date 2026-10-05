import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@tero/ui';

export type Suit = 'cups' | 'pentacles' | 'swords' | 'wands';
export const suits: Suit[] = ['cups', 'pentacles', 'swords', 'wands'];

/** The four suit drawings from the mockups, in thin gold lines. */
export function SuitIcon({ suit, size = 56 }: { suit: Suit; size?: number }) {
  const line = {
    fill: 'none',
    stroke: colors.gold,
    strokeWidth: 0.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {suit === 'cups' && (
        <>
          <Path d="M6 4h12v4a6 6 0 0 1-12 0z" {...line} />
          <Path d="M12 14v5M8 21h8" {...line} />
          <Path d="M9 7.5c1 1 5 1 6 0" {...line} />
        </>
      )}
      {suit === 'pentacles' && (
        <>
          <Circle cx={12} cy={12} r={9} {...line} />
          <Path
            d="M12 5.5l1.8 4.4 4.7.3-3.6 3 1.2 4.6-4.1-2.6-4.1 2.6 1.2-4.6-3.6-3 4.7-.3z"
            {...line}
          />
        </>
      )}
      {suit === 'swords' && (
        <>
          <Path d="M12 2.5l1.5 2.5v10h-3V5z" {...line} />
          <Path d="M7.5 15h9M12 15v4.5" {...line} />
          <Circle cx={12} cy={21} r={1} {...line} />
        </>
      )}
      {suit === 'wands' && (
        <>
          <Path d="M5 19L16 8" {...line} />
          <Path d="M16 8l2.5-2.5M18 3v2M21 6h-2M20.5 3.5l-1 1" {...line} />
        </>
      )}
    </Svg>
  );
}
