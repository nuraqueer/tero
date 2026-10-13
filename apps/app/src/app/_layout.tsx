import '@/lib/polyfills';
import { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
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
import { DiscoveryProvider } from '@/lib/discovery';
import { ChatPreparation } from '@/lib/chat-preparation';
import { ChatActivityProvider } from '@/lib/chat-activity';
import { MessageNotifications } from '@/lib/message-notifications';
import { ChatPresenceProvider } from '@/lib/chat-presence';
import { isTestingBuild } from '@/lib/testing-build';

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
  const pathname = usePathname();
  // Until the phone's storage has been read, show nothing rather than a wrong screen.
  if (state.status === 'loading') return null;
  const full = state.status === 'open' && state.mode === 'full';
  const basic = state.status === 'open' && state.mode === 'basic';

  // On the web, members get the council console in a sidebar shell; phones get the tabs.
  const web = Platform.OS === 'web';
  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ivory } }}>
      {!web && (
        <Stack.Protected guard={state.status === 'new'}>
          <Stack.Screen name="index" />
        </Stack.Protected>
      )}
      <Stack.Protected guard={state.status === 'new'}>
        <Stack.Screen name="scan" />
        <Stack.Screen name="c/[token]" />
        <Stack.Screen name="setup" />
      </Stack.Protected>
      {/* The web's private side lives under /admin (D40); phones keep /lock and the tabs. */}
      <Stack.Protected guard={state.status === 'locked' && web}>
        <Stack.Screen name="admin/lock" />
      </Stack.Protected>
      <Stack.Protected guard={state.status === 'locked' && !web}>
        <Stack.Screen name="lock" />
      </Stack.Protected>
      <Stack.Protected guard={state.status === 'new' || state.status === 'locked'}>
        <Stack.Screen name="restore" />
      </Stack.Protected>
      <Stack.Protected guard={full && web}>
        <Stack.Screen name="admin/index" />
        <Stack.Screen name="admin/cards" />
        <Stack.Screen name="admin/words" />
        <Stack.Screen name="admin/language" />
        <Stack.Screen name="admin/roles" />
      </Stack.Protected>
      {/* On the web, / is always the public site; the admin side is only at /admin, which
          the Fool and council are told about. It comes after the admin screens so a
          locked or unlocked browser that opens /admin lands on the lock or the console. */}
      {web && (
        <Stack.Protected guard>
          <Stack.Screen name="index" />
        </Stack.Protected>
      )}
      <Stack.Protected guard={full && !web}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={full}>
        <Stack.Screen name="card/[id]" />
        <Stack.Screen name="words" />
        <Stack.Screen name="cards" />
        <Stack.Screen name="my-card" options={{ animation: 'fade' }} />
        <Stack.Screen name="part/[part]" />
        <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
        <Stack.Screen name="circle" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="space" />
        <Stack.Screen name="moderation" />
        <Stack.Screen name="crisis" />
        <Stack.Screen name="map" />
      </Stack.Protected>
      <Stack.Protected
        guard={full && !web && process.env.EXPO_PUBLIC_SEFIRAH_EXPERIMENTAL === 'enabled'}
      >
        <Stack.Screen name="sefirah" />
      </Stack.Protected>
      <Stack.Protected guard={full && isTestingBuild}>
        <Stack.Screen name="card-designs" />
      </Stack.Protected>
      {/* Language and the open guides work in every state, decoy view included. */}
      <Stack.Screen name="language" />
      <Stack.Screen name="guides/index" />
      <Stack.Screen name="guides/[slug]" />
      <Stack.Protected guard={basic}>
        <Stack.Screen name="basic" />
      </Stack.Protected>
    </Stack>
  );
  // The public pages never sit inside the console's sidebar.
  const publicPage = pathname === '/' || pathname.startsWith('/guides');
  const screens = full && web && !publicPage ? <WebShell>{stack}</WebShell> : stack;
  return full ? (
    <DiscoveryProvider key={state.identity.did}>
      <ChatActivityProvider>
        <ChatPresenceProvider>
          <MessageNotifications>
            <ChatPreparation>{screens}</ChatPreparation>
          </MessageNotifications>
        </ChatPresenceProvider>
      </ChatActivityProvider>
    </DiscoveryProvider>
  ) : (
    screens
  );
}
