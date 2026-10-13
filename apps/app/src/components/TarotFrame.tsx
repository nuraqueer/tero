import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';
import { StyleSheet } from 'react-native';
import { tarot } from '@tero/ui';

/** One mirrored frame for every face and the shared back. Coordinates stay fixed. */
export function TarotFrame({ width }: { width: number }) {
  return (
    <Svg
      width={width}
      height={width * tarot.ratio}
      viewBox="0 0 200 340"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
    >
      <G fill="none" stroke={tarot.line} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={14} y={16} width={172} height={308} rx={5} strokeWidth={0.65} />
        <Rect x={18} y={20} width={164} height={300} rx={2.5} strokeWidth={0.35} opacity={0.7} />
        {[
          '',
          'translate(200 0) scale(-1 1)',
          'translate(0 340) scale(1 -1)',
          'translate(200 340) scale(-1 -1)',
        ].map((transform, i) => (
          <G key={i} transform={transform || undefined}>
            <Path d="M14 38c12 0 22-10 22-22M18 32c7 0 12-5 12-12" strokeWidth={0.7} />
            <Path d="m23 23 1.7 2.8-1.7 2.8-1.7-2.8 1.7-2.8Z" strokeWidth={0.45} />
          </G>
        ))}
        {[14, 186].map((x) => (
          <G key={x}>
            <Ellipse cx={x} cy={170} rx={4.5} ry={7} fill={tarot.paper} strokeWidth={0.65} />
            <Path d={`M${x} 166.5l2 3.5-2 3.5-2-3.5 2-3.5Z`} strokeWidth={0.45} />
          </G>
        ))}
      </G>
    </Svg>
  );
}
