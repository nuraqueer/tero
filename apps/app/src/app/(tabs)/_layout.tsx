import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts } from '@tero/ui';
import { GlassBar } from '@/components/GlassBar';
import { TabIcon, type TabName } from '@/components/TabIcons';
import { useLocale } from '@/lib/locale';

const tabs: TabName[] = ['gathering', 'circles', 'messages', 'suits', 'you'];

/** Five tabs under a floating glass bar. You opens first while the others are being built. */
export default function TabsLayout() {
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
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
    >
      <TabIcon name={name} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tabs: { flex: 1, backgroundColor: colors.ivory },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 3, minWidth: 58, minHeight: 48 },
  pressed: { opacity: 0.6 },
  label: { fontFamily: fonts.bodySemibold, fontSize: 10 },
});
