import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '@tero/ui';

/** A six-digit card code, shown as "472 913" and read out digit by digit. */
export function Code({ code }: { code: string }) {
  return (
    <Text style={styles.code} accessibilityLabel={code.split('').join(' ')} selectable={false}>
      {`${code.slice(0, 3)} ${code.slice(3)}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  code: {
    fontFamily: fonts.mark,
    fontSize: 44,
    letterSpacing: 4,
    color: colors.slate,
    textAlign: 'center',
  },
});
