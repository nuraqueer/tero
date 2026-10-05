import { StyleSheet, View, type DimensionValue } from 'react-native';
import { colors, radii, space } from '@tero/ui';

/** A grey block standing in for content that isn't built yet. */
export function Bone({
  width = '100%',
  height = 14,
  round = false,
}: {
  width?: DimensionValue;
  height?: number;
  round?: boolean;
}) {
  return (
    <View
      style={[styles.bone, { width, height, borderRadius: round ? height / 2 : radii.sm - 2 }]}
    />
  );
}

/** A row like a list item: a circle and two lines. */
export function BoneRow() {
  return (
    <View style={styles.row}>
      <Bone width={40} height={40} round />
      <View style={styles.lines}>
        <Bone width="45%" />
        <Bone width="80%" height={12} />
      </View>
    </View>
  );
}

/** A chat bubble placeholder, on the left (theirs) or the right (mine). */
export function BoneBubble({
  mine = false,
  width = '62%',
}: {
  mine?: boolean;
  width?: DimensionValue;
}) {
  return <View style={[styles.bubble, mine ? styles.mine : styles.theirs, { width }]} />;
}

const styles = StyleSheet.create({
  bone: { backgroundColor: 'rgba(31,30,29,0.08)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm + 2 },
  lines: { flex: 1, gap: space.sm },
  bubble: { height: 40, borderRadius: 20 },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(227,218,204,0.7)',
    borderBottomRightRadius: 6,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    borderBottomLeftRadius: 6,
  },
});
