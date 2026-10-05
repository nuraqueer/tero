import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, space } from '@tero/ui';
import { useLocale } from '@/lib/locale';

/** A round glass back button, a centred title and an optional action, as in the mockups. */
export function ScreenHeader({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('setup.back')}
        onPress={() => router.back()}
        style={({ pressed }) => [styles.round, pressed && styles.pressed]}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path
            d="M15 5l-7 7 7 7"
            fill="none"
            stroke={colors.slate}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      <View style={styles.titles}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

/** The round glass button used in headers. */
export function RoundButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress?: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.round, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  pressed: { opacity: 0.6 },
  titles: { flex: 1, alignItems: 'center' },
  title: { fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.slate },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  side: { width: 44, alignItems: 'flex-end' },
});
