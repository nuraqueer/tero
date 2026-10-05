import Svg, { G, Path } from 'react-native-svg';
import { colors } from '@tero/ui';

/** The letters of TERO, drawn as lines rather than set in a font (logo concept 1). */
export const wordmarkPaths = [
  { x: 0, d: 'M0 0H28M14 0V40' },
  { x: 40, d: 'M24 0H0V40H24M0 20H19' },
  { x: 76, d: 'M0 40V0H15a10 10 0 0 1 0 20H0M13 20L26 40' },
  { x: 112, d: 'M15 0a15 20 0 1 0 0.01 0' },
];

export function Wordmark({
  height = 22,
  color = colors.slate,
}: {
  height?: number;
  color?: string;
}) {
  return (
    <Svg
      width={(height * 150) / 44}
      height={height}
      viewBox="0 0 150 44"
      accessibilityRole="image"
      accessibilityLabel="Tero"
    >
      <G
        transform="translate(2 2)"
        fill="none"
        stroke={color}
        strokeWidth={3.4}
        strokeLinecap="square"
      >
        {wordmarkPaths.map(({ x, d }) => (
          <Path key={x} transform={`translate(${x} 0)`} d={d} />
        ))}
      </G>
    </Svg>
  );
}
