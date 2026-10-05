import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '@tero/ui';
import { useCardTitle } from './MemberCard';

/** The name the newcomer will take, shown at the foot of a Tero card under the QR code. */
export function CardName({ arcana }: { arcana: number }) {
  const title = useCardTitle(arcana);
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
