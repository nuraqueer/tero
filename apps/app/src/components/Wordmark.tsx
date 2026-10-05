import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '@tero/ui';

/**
 * The word "Tero", set in Cinzel like the names on the cards. (The founder turned down
 * both the monospace and the hand-drawn letters.)
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
      style={[
        styles.word,
        { fontSize: height * 1.2, lineHeight: height * 1.5, color, letterSpacing: height * 0.22 },
      ]}
    >
      TERO
    </Text>
  );
}

const styles = StyleSheet.create({
  word: { fontFamily: fonts.card },
});
