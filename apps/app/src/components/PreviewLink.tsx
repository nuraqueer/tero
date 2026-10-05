import { Pressable, StyleSheet, Text } from 'react-native';
import { router, type Href } from 'expo-router';
import { colors, fonts, space } from '@tero/ui';

/** A quiet link to the placeholder design of a screen that isn't built yet. */
export function PreviewLink({ label, href }: { label: string; href: Href }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={styles.text}>{label} ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'center', paddingVertical: space.md },
  pressed: { opacity: 0.6 },
  text: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.clayText },
});
