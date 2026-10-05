import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '@tero/ui';

/** The small tarot-card mark that sits beside the word "Tero". */
export function CardMark({ height = 64 }: { height?: number }) {
  return (
    <Svg
      width={(height * 34) / 52}
      height={height}
      viewBox="0 0 34 52"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Rect x={1} y={1} width={32} height={50} rx={5} fill={colors.slate} />
      <Rect
        x={4.5}
        y={4.5}
        width={25}
        height={43}
        rx={3}
        fill="none"
        stroke={colors.gold}
        strokeWidth={1}
      />
      <Path
        d="M17 19L18.54 24.46L24 26L18.54 27.54L17 33L15.46 27.54L10 26L15.46 24.46Z"
        fill={colors.goldLight}
      />
    </Svg>
  );
}
