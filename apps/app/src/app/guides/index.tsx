import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { PublicPage } from '@/components/PublicPage';
import { guides } from '@/guides';
import { useLocale } from '@/lib/locale';

export default function Guides() {
  const { t } = useLocale();
  return (
    <PublicPage>
      <Text style={styles.title} accessibilityRole="header">
        {t('public.guides.title')}
      </Text>
      <Text style={styles.sub}>{t('public.guides.note')}</Text>
      <View style={styles.list}>
        {guides.map((guide) => (
          <Pressable
            key={guide.slug}
            accessibilityRole="link"
            onPress={() =>
              router.push({ pathname: '/guides/[slug]', params: { slug: guide.slug } })
            }
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <Text style={styles.suit}>
              {t(`suit.${guide.suit}` as MessageKey).toUpperCase()}
              {guide.text ? '' : ` · ${t('guides.writing').toUpperCase()}`}
            </Text>
            <Text style={styles.itemTitle}>{t(`guide.${guide.key}.title` as MessageKey)}</Text>
            <Text style={styles.itemBody}>{t(`guide.${guide.key}.summary` as MessageKey)}</Text>
          </Pressable>
        ))}
      </View>
    </PublicPage>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 38, lineHeight: 44, color: colors.slate },
  sub: { fontFamily: fonts.body, fontSize: 16, color: colors.textSecondary, marginTop: space.xs },
  list: { gap: space.md, marginTop: space.lg },
  item: {
    gap: space.xs + 2,
    padding: space.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  pressed: { opacity: 0.8 },
  suit: { fontFamily: fonts.bodySemibold, fontSize: 11, letterSpacing: 1, color: colors.clayText },
  itemTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.slate },
  itemBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
});
