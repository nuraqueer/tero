import { StyleSheet, View } from 'react-native';
import { tarot } from '@tero/ui';
import { ArcanaArt } from './ArcanaArt';

/** Card-specific front symbol, shared by profile, discovery and chat. */
export function CardAvatar({ size = 64, arcana }: { size?: number; arcana?: number | null }) {
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
      <ArcanaArt arcana={arcana} width={size * 0.84} compact />
    </View>
  );
}
const styles = StyleSheet.create({
  ring: {
    backgroundColor: tarot.paper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tarot.line,
  },
});
