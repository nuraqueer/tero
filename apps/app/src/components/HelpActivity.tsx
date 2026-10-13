import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts } from '@tero/ui';
import { AppIcon } from './AppIcon';
import { communityUpdates } from '@/lib/help-activity';
import type { HelpOverview } from '@/lib/use-help-overview';
import { useLocale } from '@/lib/locale';

/** Counts come from the author-only fields of the existing Help boards. */
export function HelpActivity({ overview }: { overview: HelpOverview }) {
  const { t } = useLocale();
  const [limit, setLimit] = useState(3);
  const posts = communityUpdates(overview, true).filter((post) => post.mine);
  if (!posts.length) return null;
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        {t('help.yourPosts')}
      </Text>
      <Text style={styles.note}>{t('help.yourPostsHint')}</Text>
      <View style={styles.list}>
        {posts.slice(0, limit).map((post) => (
          <Pressable
            key={`${post.part}/${post.id}`}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/part/[part]',
                params: { part: post.part, focus: post.id },
              })
            }
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.content}>
              <Text style={styles.category}>
                {t(`part.${post.part}` as MessageKey)}
                {post.closed ? ` · ${t('aid.done')}` : ''}
              </Text>
              <Text style={styles.title} numberOfLines={2}>
                {post.title}
              </Text>
              {post.replies !== undefined && (
                <Text style={[styles.replies, post.replies > 0 && styles.hasReplies]}>
                  {t('aid.replies', { count: post.replies })}
                </Text>
              )}
            </View>
            <AppIcon name="arrow" size={17} color={colors.clayText} />
          </Pressable>
        ))}
      </View>
      {posts.length > limit && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setLimit((v) => v + 6)}
          style={styles.more}
        >
          <Text style={styles.moreText}>{t('common.showMore')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 27 },
  heading: { fontFamily: fonts.display, fontSize: 25, color: colors.slate },
  note: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 13,
  },
  list: { backgroundColor: colors.paper, borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  content: { flex: 1, gap: 4 },
  category: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  title: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: colors.slate },
  replies: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  hasReplies: { fontFamily: fonts.bodySemibold, color: colors.clayText },
  more: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 4 },
  moreText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.clayText },
  pressed: { opacity: 0.7 },
});
