import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, space } from '@tero/ui';
import { Button } from './Button';
import { useFullSession } from '@/lib/session';
import { isTestingBuild } from '@/lib/testing-build';

/** Explicit test account switch. Never deletes a network account or changes its role. */
export function TestDeviceReset() {
  const session = useFullSession();
  if (!isTestingBuild || !session) return null;

  const confirm = () =>
    Alert.alert(
      'Use another test account?',
      'Save this account’s 12 recovery words first. This removes its login and biometric unlock from this phone. Its Tero membership stays intact, and the saved words can restore it.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Recovery words', onPress: () => router.push('/words') },
        {
          text: 'Words saved, reset device',
          style: 'destructive',
          onPress: () => {
            void session
              .forgetDevice()
              .catch(() =>
                Alert.alert(
                  'Could not reset this device',
                  'Storage could not be cleared. Reopen Tero and try again. Your saved recovery words can restore the account.',
                ),
              );
          },
        },
      ],
    );

  return (
    <View style={styles.section}>
      <Text style={styles.note}>Test tools · account switching</Text>
      <Button label="Use another test account" kind="quiet" onPress={confirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 12, gap: space.sm },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
});
