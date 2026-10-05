import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@tero/ui';

/** The back of a Tero card: the same frame, a ring of stars around one large star. */
export function CardBack({ width }: { width: number }) {
  const height = Math.round(width * 1.55);
  const dots = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: 75 + Math.cos(a) * 46, y: 116 + Math.sin(a) * 46 };
  });
  return (
    <View style={[styles.card, { width, height }]}>
      <View style={styles.outer}>
        <View style={styles.inner}>
          <Svg width="100%" height="100%" viewBox="0 0 150 232" preserveAspectRatio="xMidYMid meet">
            <Circle cx={75} cy={116} r={58} fill="none" stroke={colors.gold} strokeWidth={0.8} />
            <Circle cx={75} cy={116} r={34} fill="none" stroke={colors.gold} strokeWidth={0.8} />
            {dots.map((d, i) => (
              <Circle key={i} cx={d.x} cy={d.y} r={1.3} fill={colors.gold} />
            ))}
            <Path
              d="M75 92L81 110L99 116L81 122L75 140L69 122L51 116L69 110Z"
              fill={colors.goldLight}
            />
            <Path
              d="M75 24v14M75 194v14M30 116h-10M120 116h10"
              stroke={colors.gold}
              strokeWidth={0.8}
              strokeLinecap="round"
            />
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: colors.slateSoft,
    padding: 8,
    shadowColor: colors.slate,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  outer: { flex: 1, borderWidth: 1.2, borderColor: colors.gold, borderRadius: 10, padding: 5 },
  inner: {
    flex: 1,
    borderWidth: 0.6,
    borderColor: 'rgba(201,162,126,0.6)',
    borderRadius: 6,
    padding: 8,
  },
});
