import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { CardMark } from '@/components/CardMark';
import { useLocale } from '@/lib/locale';
import { useSession } from '@/lib/session';

/** The top of every open screen: the mark, and a button to lock straight away. */
export function AppHeader() {
  const { t } = useLocale();
  const { lock } = useSession();
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <CardMark height={30} />
        <Text style={styles.wordmark}>Tero</Text>
      </View>
      <Button label={t('home.lock')} onPress={lock} kind="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xl,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  wordmark: { fontFamily: fonts.mark, fontSize: 22, color: colors.slate },
});
