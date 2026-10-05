import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '@tero/ui';

/** The four areas of help, in plain words. */
export type Area = 'care' | 'work' | 'safety' | 'health';
export const areas: Area[] = ['care', 'work', 'safety', 'health'];

/** Plain line icons for the areas: a heart, a bag, a shield, a leaf. */
export function AreaIcon({
  area,
  size = 56,
  color = colors.gold,
}: {
  area: Area;
  size?: number;
  color?: string;
}) {
  const line = {
    fill: 'none',
    stroke: color,
    strokeWidth: 1.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {area === 'care' && (
        <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" {...line} />
      )}
      {area === 'work' && (
        <>
          <Rect x={3.5} y={7.5} width={17} height={12} rx={2} {...line} />
          <Path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17" {...line} />
        </>
      )}
      {area === 'safety' && (
        <>
          <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" {...line} />
          <Path d="M9 12l2 2 4-4" {...line} />
        </>
      )}
      {area === 'health' && (
        <>
          <Path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" {...line} />
          <Path d="M5 19l8-8" {...line} />
        </>
      )}
    </Svg>
  );
}
