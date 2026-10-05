import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '@tero/ui';
import { useCardTitle } from './MemberCard';

/** The inviter's card name, shown at the foot of a Tero card under the QR code. */
export function CardName({ sequence }: { sequence: number }) {
  const title = useCardTitle(sequence);
  return <Text style={styles.name}>{title.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  name: {
    fontFamily: fonts.card,
    fontSize: 16,
    letterSpacing: 3,
    color: colors.oatLight,
    textAlign: 'center',
  },
});
