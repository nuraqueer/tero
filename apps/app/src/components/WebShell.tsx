import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableStateCallbackType,
  useWindowDimensions,
} from 'react-native';
import { router, usePathname, type Href } from 'expo-router';
import { webRoles } from '@tero/protocol';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { CardAvatar } from '@/components/CardAvatar';
import { CardMark } from '@/components/CardMark';
import { useCardTitle } from '@/components/MemberCard';
import { Wordmark } from '@/components/Wordmark';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';

type Item = { label: string; href?: Href };

/** React Native for Web adds hovered to the pressable state. */
const hoveredIn = (state: PressableStateCallbackType) =>
  (state as PressableStateCallbackType & { hovered?: boolean }).hovered === true;

/**
 * The web is for the Fool and the council (D40): a sidebar of council tools beside the
 * page. Everyone else, moderators included, is pointed to the phone app.
 */
export function WebShell({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const session = useFullSession();
  const path = usePathname();
  const title = useCardTitle(session?.arcana ?? 0);
  const { width } = useWindowDimensions();
  if (!session) return null;

  // Not a member yet (waiting to be let in) or still asking the server: show the page.
  if (session.role === 'member') return <PhoneOnly />;

  const items: Item[] = [
    { label: t('console.overview'), href: '/admin' },
    { label: t('home.cards.title'), href: '/admin/cards' },
    { label: t('console.votes') },
    { label: t('console.verifications') },
    { label: t('console.countries') },
    { label: t('console.moderators') },
    { label: t('console.log') },
    { label: t('roles.title'), href: '/admin/roles' },
  ];
  const settings: Item[] = [
    { label: t('words.open'), href: '/admin/words' },
    { label: t('welcome.language'), href: '/admin/language' },
  ];
  const council = session.role !== null && webRoles.includes(session.role);

  const link = (item: Item) => {
    const on = item.href === path;
    return (
      <Pressable
        key={item.label}
        accessibilityRole="link"
        accessibilityState={{ disabled: !item.href, selected: on }}
        disabled={!item.href}
        onPress={() => item.href && router.navigate(item.href)}
        style={(state) => [
          styles.item,
          on && styles.itemOn,
          (state.pressed || hoveredIn(state)) && item.href && !on && styles.itemHover,
        ]}
      >
        <Text style={[styles.itemText, on && styles.itemTextOn, !item.href && styles.itemSoon]}>
          {item.label}
        </Text>
        {!item.href && <Text style={styles.soon}>{t('suit.soon')}</Text>}
      </Pressable>
    );
  };

  // A narrow window gets a top bar with the links in one scrolling row.
  if (width < 760) {
    return (
      <View style={styles.narrow}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <CardMark height={26} />
            <Wordmark height={14} />
          </View>
          <Button label={t('home.lock')} onPress={session.lock} kind="secondary" />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.topLinks}
          contentContainerStyle={styles.topLinksRow}
        >
          {[...(council ? items.filter((item) => item.href) : []), ...settings].map(link)}
        </ScrollView>
        <View style={styles.main}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <View style={styles.side} role="navigation">
        <View style={styles.brand}>
          <CardMark height={28} />
          <Wordmark height={16} />
        </View>
        {council && <Text style={styles.group}>{t('console.council')}</Text>}
        {council && items.map(link)}
        <Text style={styles.group}>{t('tabs.you')}</Text>
        {settings.map(link)}
        <View style={styles.spacer} />
        {council && session.arcana !== null && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/admin/my-card')}
            style={(state) => [styles.me, hoveredIn(state) && styles.itemHover]}
          >
            <CardAvatar size={40} />
            <View style={styles.meText}>
              <Text style={styles.meName}>{title}</Text>
              <Text style={styles.meSub}>
                {session.role === 'fool' ? t('console.owner') : t('console.seat')}
              </Text>
            </View>
          </Pressable>
        )}
        <Button label={t('home.lock')} onPress={session.lock} kind="secondary" />
      </View>
      <View style={styles.main}>{children}</View>
    </View>
  );
}

function PhoneOnly() {
  const { t } = useLocale();
  const session = useFullSession();
  return (
    <ScrollView contentContainerStyle={styles.only}>
      <CardMark height={56} />
      <Text style={styles.onlyTitle} accessibilityRole="header">
        {t('console.phoneOnly.title')}
      </Text>
      <Text style={styles.onlyBody}>{t('console.phoneOnly.body')}</Text>
      <Button label={t('home.lock')} onPress={() => session?.lock()} kind="secondary" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: colors.ivory },
  side: {
    width: 288,
    paddingHorizontal: space.md,
    paddingVertical: space.lg,
    gap: 2,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.hairline,
    backgroundColor: colors.oatLight,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
    marginBottom: space.lg,
  },
  group: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: space.sm + 4,
    marginTop: space.md,
    marginBottom: space.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    paddingHorizontal: space.sm + 4,
    borderRadius: radii.sm,
  },
  itemOn: { backgroundColor: colors.paper },
  itemHover: { backgroundColor: 'rgba(31,30,29,0.05)' },
  itemText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.slate },
  itemTextOn: { fontFamily: fonts.bodySemibold, color: colors.clayText },
  itemSoon: { color: colors.textMuted },
  soon: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  spacer: { flex: 1, minHeight: space.lg },
  me: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 4,
    padding: space.sm,
    borderRadius: radii.md,
    marginBottom: space.sm,
  },
  meText: { flex: 1 },
  meName: { fontFamily: fonts.display, fontSize: 18, color: colors.slate },
  meSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  main: { flex: 1 },
  narrow: { flex: 1, backgroundColor: colors.ivory },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingTop: space.md,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  topLinks: {
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  topLinksRow: { gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.sm },
  only: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
    maxWidth: 480,
    alignSelf: 'center',
  },
  onlyTitle: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.slate,
    textAlign: 'center',
  },
  onlyBody: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: space.md,
  },
});
