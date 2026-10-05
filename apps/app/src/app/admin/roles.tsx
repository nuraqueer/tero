import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { useLocale } from '@/lib/locale';

type Who = 'fool' | 'council' | 'moderators' | 'members';
const who: Who[] = ['fool', 'council', 'moderators', 'members'];

/** y: yes, n: no, or a message key for a qualified answer. Matches docs/roles-and-sequences.md. */
const rows: Array<[MessageKey, Record<Who, 'y' | 'n' | MessageKey>]> = [
  ['roles.row.publicSite', { fool: 'y', council: 'y', moderators: 'y', members: 'y' }],
  ['roles.row.phoneApp', { fool: 'y', council: 'y', moderators: 'y', members: 'y' }],
  ['roles.row.webConsole', { fool: 'y', council: 'y', moderators: 'n', members: 'n' }],
  ['roles.row.status', { fool: 'y', council: 'y', moderators: 'n', members: 'n' }],
  ['roles.row.cards', { fool: 'y', council: 'y', moderators: 'y', members: 'roles.bySequence' }],
  ['roles.row.seat', { fool: 'y', council: 'roles.byVote', moderators: 'n', members: 'n' }],
  ['roles.row.vote', { fool: 'roles.veto', council: 'y', moderators: 'n', members: 'n' }],
  ['roles.row.verify', { fool: 'y', council: 'y', moderators: 'n', members: 'n' }],
  [
    'roles.row.reports',
    { fool: 'roles.oversee', council: 'roles.oversee', moderators: 'y', members: 'n' },
  ],
  ['roles.row.messages', { fool: 'n', council: 'n', moderators: 'n', members: 'roles.ownOnly' }],
  ['roles.row.tree', { fool: 'n', council: 'n', moderators: 'n', members: 'n' }],
];

/** Who can see and do what, in one table, so nobody has to guess. */
export default function Roles() {
  const { t } = useLocale();
  const cell = (value: 'y' | 'n' | MessageKey) =>
    value === 'y' ? (
      <Text style={styles.yes}>✓</Text>
    ) : value === 'n' ? (
      <Text style={styles.no}>—</Text>
    ) : (
      <Text style={styles.some}>{t(value)}</Text>
    );
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.title} accessibilityRole="header">
        {t('roles.title')}
      </Text>
      <Text style={styles.sub}>{t('roles.sub')}</Text>
      <View style={styles.table}>
        <View style={[styles.row, styles.head]}>
          <Text style={[styles.first, styles.headText]} />
          {who.map((w) => (
            <Text key={w} style={[styles.col, styles.headText]}>
              {t(`roles.who.${w}` as MessageKey)}
            </Text>
          ))}
        </View>
        {rows.map(([label, values]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.first}>{t(label)}</Text>
            {who.map((w) => (
              <View key={w} style={styles.col}>
                {cell(values[w])}
              </View>
            ))}
          </View>
        ))}
      </View>
      <Text style={styles.foot}>{t('roles.foot')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: space.xl,
    paddingTop: space.xl + space.md,
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.slate },
  sub: { fontFamily: fonts.body, fontSize: 16, color: colors.textSecondary, marginTop: space.xs },
  table: {
    marginTop: space.xl,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(31,30,29,0.1)',
  },
  head: { borderTopWidth: 0, backgroundColor: colors.oatLight },
  headText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  first: {
    flex: 2,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.slate,
    paddingVertical: 10,
  },
  col: { flex: 1, alignItems: 'center', textAlign: 'center' },
  yes: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.clayText },
  no: { fontFamily: fonts.body, fontSize: 16, color: colors.textMuted },
  some: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  foot: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: space.md,
  },
});
