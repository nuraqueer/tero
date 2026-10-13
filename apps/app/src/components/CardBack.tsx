import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { tarot } from '@tero/ui';
import { TarotFrame } from './TarotFrame';

/** Shared by every card: one celestial seal, independent of role or Arcana. */
export function CardBack({ width }: { width: number }) {
  return (
    <View style={[styles.card, { width, height: width * tarot.ratio, borderRadius: width * 0.04 }]}>
      <TarotFrame width={width} />
      <Svg
        width={width}
        height={width * tarot.ratio}
        viewBox="0 0 200 340"
        accessibilityElementsHidden
      >
        <G fill="none" stroke={tarot.line} strokeWidth={0.65}>
          <Circle cx={100} cy={170} r={57} />
          <Circle cx={100} cy={170} r={32} />
          <Path d="M100 99v9m0 124v9M29 170h9m124 0h9" />
        </G>
        {Array.from({ length: 12 }, (_, i) => (
          <Circle
            key={i}
            cx={100 + Math.cos((i * Math.PI) / 6) * 45}
            cy={170 + Math.sin((i * Math.PI) / 6) * 45}
            r={1.15}
            fill={tarot.line}
          />
        ))}
        <Path d="m100 146 6 18 18 6-18 6-6 18-6-18-18-6 18-6 6-18Z" fill={tarot.ink} />
        <Path
          d="m100 153 4 13 13 4-13 4-4 13-4-13-13-4 13-4 4-13Z"
          fill="none"
          stroke={tarot.back}
          strokeWidth={0.7}
        />
      </Svg>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: tarot.back,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
});
