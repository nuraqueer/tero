import '@/lib/polyfills';
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
import { Platform } from 'react-native';
import { colors } from '@tero/ui';
import { LocaleProvider } from '@/lib/locale';
import { SessionProvider, useSession } from '@/lib/session';
import { WebShell } from '@/components/WebShell';

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
      <SessionProvider>
        <StatusBar style="dark" />
        <Screens />
      </SessionProvider>
    </LocaleProvider>
  );
}

/** Each screen exists only in its state, so nothing behind the lock can be reached by URL or back gesture. */
function Screens() {
  const { state } = useSession();
  // Until the phone's storage has been read, show nothing rather than a wrong screen.
  if (state.status === 'loading') return null;
  const full = state.status === 'open' && state.mode === 'full';
  const basic = state.status === 'open' && state.mode === 'basic';

  // On the web, members get the council console in a sidebar shell; phones get the tabs.
  const web = Platform.OS === 'web';
  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ivory } }}>
      <Stack.Protected guard={state.status === 'new'}>
        <Stack.Screen name="index" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="c/[token]" />
        <Stack.Screen name="setup" />
      </Stack.Protected>
      <Stack.Protected guard={state.status === 'locked'}>
        <Stack.Screen name="lock" />
      </Stack.Protected>
      <Stack.Protected guard={state.status === 'new' || state.status === 'locked'}>
        <Stack.Screen name="restore" />
      </Stack.Protected>
      <Stack.Protected guard={full && web}>
        <Stack.Screen name="console" />
      </Stack.Protected>
      <Stack.Protected guard={full && !web}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={full}>
        <Stack.Screen name="card/[id]" />
        <Stack.Screen name="words" />
        <Stack.Screen name="cards" />
        <Stack.Screen name="language" />
        <Stack.Screen
          name="my-card"
          options={{ animation: 'fade', contentStyle: { backgroundColor: '#0E0E0D' } }}
        />
        <Stack.Screen name="suit/[suit]" />
      </Stack.Protected>
      {/* The open guides are public: readable in every state, decoy view included. */}
      <Stack.Screen name="guides/index" />
      <Stack.Screen name="guides/[slug]" />
      <Stack.Protected guard={basic}>
        <Stack.Screen name="basic" />
      </Stack.Protected>
    </Stack>
  );
  return full && web ? <WebShell>{stack}</WebShell> : stack;
}
