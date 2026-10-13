import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space } from '@tero/ui';
import { useNavigationBar } from '@/lib/navigation-bar';

/** A scrolling page with the standard margins and width. */
export function Page({
  children,
  center = false,
  tabs = false,
  onRefresh,
}: {
  children: ReactNode;
  center?: boolean;
  /** Leaves room at the bottom for the floating tab bar. */
  tabs?: boolean;
  onRefresh?: () => Promise<void>;
}) {
  const [pulling, setPulling] = useState(false);
  const refreshGeneration = useRef(0);
  const navigationBar = useNavigationBar();
  const reveal = navigationBar?.reveal;
  useFocusEffect(
    useCallback(() => {
      refreshGeneration.current++;
      setPulling(false);
      if (tabs) reveal?.();
      return () => {
        refreshGeneration.current++;
        setPulling(false);
      };
    }, [tabs, reveal]),
  );
  const refresh = async () => {
    if (pulling || !onRefresh) return;
    const generation = ++refreshGeneration.current;
    setPulling(true);
    // Network work can finish silently; a refresh gesture never pins the page open.
    const finish = () => {
      if (refreshGeneration.current === generation) setPulling(false);
    };
    const timeout = setTimeout(finish, 12_000);
    try {
      await onRefresh();
    } catch {
      /* The owning screen reports its load error. */
    } finally {
      clearTimeout(timeout);
      finish();
    }
  };
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.page, center && styles.center, tabs && styles.tabs]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={pulling}
              onRefresh={() => void refresh()}
              tintColor={colors.textMuted}
              colors={[colors.textMuted]}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        onScroll={tabs ? (event) => navigationBar?.onScroll(event.nativeEvent) : undefined}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  page: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  center: { justifyContent: 'center' },
  tabs: { paddingBottom: 128 },
});
