import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from 'react-native';
import { usePathname } from 'expo-router';
import { BlurTargetView } from 'expo-blur';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, navigation } from '@tero/ui';
import { GlassBar } from '@/components/GlassBar';
import { TabIcon, type TabName } from '@/components/TabIcons';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';
import { compactMemberCount } from '@/lib/member-count';
import { NavigationBarProvider, useNavigationBar } from '@/lib/navigation-bar';
import { useChatActivity } from '@/lib/chat-activity';

const tabs: TabName[] = ['gathering', 'circles', 'messages', 'help', 'you'];

// Headless Tabs reads its initial route from the layout metadata in SDK 57.
export const unstable_settings = { initialRouteName: 'gathering' };

/**
 * One floating bar keeps spacing, icons and motion consistent across platforms.
 * Gathering is the landing tab for an unlocked mobile session.
 */
export default function TabsLayout() {
  return (
    <NavigationBarProvider>
      <TabNavigation />
    </NavigationBarProvider>
  );
}

function TabNavigation() {
  const { t } = useLocale();
  const session = useFullSession();
  const { total: unread } = useChatActivity();
  const api = session?.api;
  const member = session?.member;
  const connection = session?.connection;
  const did = session?.identity.did;
  const [networkSize, setNetworkSize] = useState<{ did: string; members: number } | null>(null);
  const memberCount =
    member && connection === 'connected' && networkSize?.did === did
      ? (networkSize?.members ?? null)
      : null;
  const pathname = usePathname();
  const activeIndex = Math.max(
    0,
    tabs.findIndex((name) => pathname === `/${name}`),
  );
  const [reduceMotion, setReduceMotion] = useState(true);
  const [reduceTransparency, setReduceTransparency] = useState(true);
  const blurTarget = useRef<View | null>(null);
  const navigationBar = useNavigationBar();

  useEffect(() => {
    let active = true;
    let loading = false;
    const refresh = async () => {
      if (
        !active ||
        loading ||
        !member ||
        !did ||
        connection !== 'connected' ||
        AppState.currentState !== 'active'
      )
        return;
      const client = api?.();
      if (!client) return;
      loading = true;
      try {
        const result = await client.networkSize();
        if (active && Number.isSafeInteger(result.members) && result.members >= 0)
          setNetworkSize({ did, members: result.members });
      } catch {
        if (active) setNetworkSize(null);
      } finally {
        loading = false;
      }
    };
    void refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [api, member, connection, did]);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (active) setReduceMotion(reduce);
    });
    AccessibilityInfo.isReduceTransparencyEnabled().then((reduce) => {
      if (active) setReduceTransparency(reduce);
    });
    const transparency = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency,
    );
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
      transparency.remove();
    };
  }, []);

  return (
    <Tabs style={styles.tabs}>
      <BlurTargetView ref={blurTarget} style={styles.content}>
        <TabSlot />
      </BlurTargetView>
      <TabList asChild>
        <GlassBar
          accessibilityRole="tablist"
          activeIndex={activeIndex}
          activeLabel={t(`tabs.${tabs[activeIndex]}` as MessageKey)}
          tabCount={tabs.length}
          reduceMotion={reduceMotion}
          blurTarget={blurTarget}
          reduceTransparency={reduceTransparency}
        >
          {tabs.map((name) => (
            <TabTrigger key={name} name={name} href={`/${name}`} asChild>
              <TabButton
                name={name}
                label={t(`tabs.${name}` as MessageKey)}
                reduceMotion={reduceMotion}
                count={
                  name === 'circles'
                    ? memberCount
                    : name === 'messages' && unread > 0
                      ? unread
                      : null
                }
                compact={navigationBar?.collapsed === true && activeIndex < tabs.length - 1}
              />
            </TabTrigger>
          ))}
        </GlassBar>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = PressableProps & {
  name: TabName;
  label: string;
  isFocused?: boolean;
  reduceMotion: boolean;
  count: number | null;
  compact: boolean;
};

const TabButton = forwardRef<View, TabButtonProps>(function TabButton(
  { name, label, isFocused = false, reduceMotion, count, compact, onPressIn, onPressOut, ...props },
  ref,
) {
  const color = isFocused ? colors.clayText : colors.textSecondary;
  const { t } = useLocale();
  const [scale] = useState(() => new Animated.Value(1));
  const animatePress = (pressed: boolean) => {
    Animated.spring(scale, {
      toValue: pressed && !reduceMotion ? 0.94 : 1,
      damping: 24,
      stiffness: 320,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  };
  useEffect(() => {
    if (reduceMotion) {
      scale.stopAnimation();
      scale.setValue(1);
    }
    return () => scale.stopAnimation();
  }, [reduceMotion, scale]);
  return (
    <Pressable
      ref={ref}
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={
        count === null
          ? label
          : `${label}, ${t(name === 'messages' ? 'messages.unread' : 'circles.memberCount', { count })}`
      }
      accessibilityState={{ selected: isFocused }}
      onPressIn={(event) => {
        animatePress(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animatePress(false);
        onPressOut?.(event);
      }}
      style={[
        styles.tab,
        name === 'you' && styles.profileTab,
        name === 'you' && isFocused && styles.profileSelected,
        name !== 'you' && compact && isFocused && styles.profileSelected,
      ]}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale }] }]}>
        <View>
          <TabIcon name={name} color={color} size={navigation.iconSize} />
          {count !== null && (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>
                {name === 'messages' && count > 99 ? '99+' : compactMemberCount(count)}
              </Text>
            </View>
          )}
        </View>
        {name !== 'you' && !compact && (
          <Text numberOfLines={1} style={[styles.label, { color }]}>
            {label}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tabs: { flex: 1, backgroundColor: colors.ivory },
  content: { flex: 1 },
  profileTab: {
    minHeight: Platform.OS === 'android' ? navigation.androidHeight : navigation.height,
    borderRadius: (Platform.OS === 'android' ? navigation.androidHeight : navigation.height) / 2,
  },
  profileSelected: { backgroundColor: 'rgba(31,30,29,0.065)' },
  badge: {
    position: 'absolute',
    top: -4,
    left: 17,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.clayText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: { fontFamily: fonts.bodySemibold, fontSize: 8, lineHeight: 11, color: colors.paper },
  tab: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  label: { fontFamily: fonts.bodySemibold, fontSize: 10, lineHeight: 13 },
});
