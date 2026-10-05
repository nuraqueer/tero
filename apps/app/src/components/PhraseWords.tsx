import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, space } from '@tero/ui';

/** The 12 words in numbered boxes, three to a row. */
export function PhraseWords({ words }: { words: string[] }) {
  return (
    <View style={styles.words}>
      {words.map((word, i) => (
        <View key={i} style={styles.word}>
          <Text style={styles.wordNumber}>{i + 1}</Text>
          <Text style={styles.wordText} selectable={false}>
            {word}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  words: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.lg,
    justifyContent: 'center',
  },
  word: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.sm,
    width: '31%',
    minWidth: 120,
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  wordNumber: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, minWidth: 18 },
  wordText: { fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.slate },
});
