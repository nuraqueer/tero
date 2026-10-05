import { forwardRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts } from '@tero/ui';
import { GlassBar } from '@/components/GlassBar';
import { TabIcon, type TabName } from '@/components/TabIcons';
import { useLocale } from '@/lib/locale';

const tabs: TabName[] = ['gathering', 'circles', 'messages', 'suits', 'you'];

/** The system's own symbols for the native tab bar: SF Symbols on iOS, Material on Android. */
const nativeIcons = {
  gathering: { sf: 'person.3', md: 'groups' },
  circles: { sf: 'circle.circle', md: 'join' },
  messages: { sf: 'message', md: 'chat_bubble' },
  suits: { sf: 'square.grid.2x2', md: 'grid_view' },
  you: { sf: 'person.text.rectangle', md: 'badge' },
} as const;

/**
 * Five tabs. On phones they are the system tab bar, so iOS 26 draws real Liquid Glass and
 * Android its own; the web gets Tero's glass bar. You opens first while the others are built.
 */
export default function TabsLayout() {
  return Platform.OS === 'web' ? <WebTabs /> : <PhoneTabs />;
}

function PhoneTabs() {
  const { t } = useLocale();
  return (
    <NativeTabs tintColor={colors.clayText} minimizeBehavior="onScrollDown">
      {tabs.map((name) => (
        <NativeTabs.Trigger key={name} name={name}>
          <NativeTabs.Trigger.Label>{t(`tabs.${name}` as MessageKey)}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={nativeIcons[name].sf} md={nativeIcons[name].md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

function WebTabs() {
  const { t } = useLocale();
  return (
    <Tabs style={styles.tabs} options={{ initialRouteName: 'you' }}>
      <TabSlot />
      <TabList asChild>
        <GlassBar accessibilityRole="tablist">
          {tabs.map((name) => (
            <TabTrigger key={name} name={name} href={`/${name}`} asChild>
              <TabButton name={name} label={t(`tabs.${name}` as MessageKey)} />
            </TabTrigger>
          ))}
        </GlassBar>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = PressableProps & { name: TabName; label: string; isFocused?: boolean };

const TabButton = forwardRef<View, TabButtonProps>(function TabButton(
  { name, label, isFocused = false, ...props },
  ref,
) {
  const color = isFocused ? colors.clayText : colors.textSecondary;
  return (
    <Pressable
      ref={ref}
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.tab, isFocused && styles.selected, pressed && styles.pressed]}
    >
      <TabIcon name={name} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tabs: { flex: 1, backgroundColor: colors.ivory },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 52,
    borderRadius: 26,
  },
  // The capsule of glass behind the chosen tab, as on iOS 26.
  selected: { backgroundColor: 'rgba(31,30,29,0.07)' },
  pressed: { opacity: 0.6 },
  label: { fontFamily: fonts.bodySemibold, fontSize: 10 },
});
