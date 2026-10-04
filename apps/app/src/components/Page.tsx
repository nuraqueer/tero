import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space } from '@tero/ui';

/** A scrolling page with the standard margins and width. */
export function Page({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.page, center && styles.center]}
        keyboardShouldPersistTaps="handled"
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
});
