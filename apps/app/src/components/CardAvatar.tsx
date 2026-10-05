import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@tero/ui';

const star = (x: number, y: number, r: number) => {
  const k = r * 0.28;
  return `M${x} ${y - r}L${x + k} ${y - k}L${x + r} ${y}L${x + k} ${y + k}L${x} ${y + r}L${x - k} ${y + k}L${x - r} ${y}L${x - k} ${y - k}Z`;
};

/** A round avatar with the card's symbol: the sun, its rays and the star at its heart. */
export function CardAvatar({ size = 64 }: { size?: number }) {
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 48 48">
        <Circle cx={24} cy={24} r={11} fill="none" stroke={colors.gold} strokeWidth={1.1} />
        <Path
          d="M24 6v5M24 37v5M6 24h5M37 24h5M11.3 11.3l3.5 3.5M33.2 33.2l3.5 3.5M11.3 36.7l3.5-3.5M33.2 14.8l3.5-3.5"
          stroke={colors.gold}
          strokeWidth={1.1}
          strokeLinecap="round"
        />
        <Path
          d="M28 17.5a8 8 0 1 0 0 13 6.3 6.3 0 0 1 0-13z"
          fill={colors.gold}
          fillOpacity={0.14}
          stroke={colors.gold}
          strokeWidth={0.9}
        />
        <Path d={star(24, 24, 4.2)} fill={colors.goldLight} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    backgroundColor: colors.slate,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
});
