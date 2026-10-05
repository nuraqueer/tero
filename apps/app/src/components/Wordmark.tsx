import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '@tero/ui';

/**
 * The word "Tero", in the Newsreader serif of the headings: calm, not a game. (The founder
 * turned down the monospace, the hand-drawn letters and the tarot capitals.)
 */
export function Wordmark({
  height = 22,
  color = colors.slate,
}: {
  height?: number;
  color?: string;
}) {
  return (
    <Text
      accessibilityRole="text"
      style={[styles.word, { fontSize: height * 1.35, lineHeight: height * 1.6, color }]}
    >
      Tero
    </Text>
  );
}

const styles = StyleSheet.create({
  word: { fontFamily: fonts.displayMedium, letterSpacing: 0.2 },
});
