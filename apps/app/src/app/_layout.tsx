import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Newsreader_400Regular, Newsreader_500Medium } from '@expo-google-fonts/newsreader';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono';
import { Cinzel_500Medium } from '@expo-google-fonts/cinzel';
import { colors } from '@tero/ui';
import { LocaleProvider } from '@/lib/locale';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    JetBrainsMono_600SemiBold,
    Cinzel_500Medium,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // Keep the splash screen up until fonts load; fall back to system fonts on error.
  if (!loaded && !error) return null;

  return (
    <LocaleProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ivory } }}
      />
    </LocaleProvider>
  );
}
