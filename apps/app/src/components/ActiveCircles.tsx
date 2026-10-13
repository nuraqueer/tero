import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@tero/ui';

type ActiveCircle = {
  id: string;
  title: string;
  onPress: () => void;
};

/** Only real active sessions belong here; an empty source reserves no space. */
export function ActiveCircles({ items }: { items: readonly ActiveCircle[] }) {
  if (!items.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          onPress={item.onPress}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          <View style={styles.live} />
          <Text style={styles.title}>{item.title}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  rail: { gap: 8, paddingBottom: 12 },
  item: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.oatLight,
  },
  title: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate },
  live: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.clayText },
  pressed: { opacity: 0.65 },
});
