import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Page } from '@/components/Page';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SoonNote } from '@/components/SoonNote';
import { useLocale } from '@/lib/locale';

/** The six post types (D37), each with its own fields once posting is built (M4). */
const types = ['post', 'ask', 'offer', 'event', 'fundraiser', 'poll'] as const;

export default function Compose() {
  const { t } = useLocale();
  const [type, setType] = useState<(typeof types)[number]>('post');
  const [text, setText] = useState('');
  return (
    <Page>
      <ScreenHeader title={t('compose.title')} />
      <View style={styles.pills}>
        {types.map((name) => (
          <Pressable
            key={name}
            accessibilityRole="radio"
            accessibilityState={{ selected: name === type }}
            onPress={() => setType(name)}
            style={[styles.pill, name === type && styles.pillOn]}
          >
            <Text style={[styles.pillText, name === type && styles.pillTextOn]}>
              {t(`compose.type.${name}` as MessageKey)}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        placeholder={t('compose.placeholder')}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={t('compose.placeholder')}
        style={styles.input}
      />
      <Text style={styles.note}>{t('compose.photos')}</Text>
      <View style={styles.actions}>
        <Button label={t('compose.post')} onPress={() => undefined} disabled />
      </View>
      <SoonNote text={t('compose.soon')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(31,30,29,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(31,30,29,0.12)',
  },
  pillOn: { backgroundColor: colors.slate, borderColor: colors.slate },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate },
  pillTextOn: { color: colors.ivory },
  input: {
    marginTop: space.lg,
    minHeight: 180,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 25,
    color: colors.slate,
    textAlignVertical: 'top',
  },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: space.sm },
  actions: { marginTop: space.lg },
});
