import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { arrangePhraseWords, completePhraseWord, isPhraseWord, isValidPhrase } from '@tero/crypto';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Page } from '@/components/Page';
import { useLocale } from '@/lib/locale';
import { SetupFlow } from './setup';

const count = 12;

/**
 * Restore with the 12 words: on a new phone or browser, or after forgetting the
 * passcode. The same words give the same Tero address; a new passcode replaces the old one.
 * One numbered box per word, matching the paper. Pasting or typing several words at once
 * fills the following boxes.
 */
export default function Restore() {
  const { t } = useLocale();
  const [words, setWords] = useState<string[]>(() => Array(count).fill(''));
  const [checked, setChecked] = useState(false);
  const [phrase, setPhrase] = useState<string | null>(null);
  const inputs = useRef<Array<TextInput | null>>([]);

  if (phrase) return <SetupFlow restorePhrase={phrase} />;

  const change = (index: number, text: string) => {
    setChecked(false);
    // A paste with numbers ("1 onion 2 tomato", "1. onion" lines): each word to its number.
    if (/\d/.test(text) && /[a-z]/i.test(text)) {
      const arranged = arrangePhraseWords(text, count);
      setWords((all) => all.map((w, i) => arranged[i] || w));
      inputs.current[
        Math.max(
          0,
          arranged.findIndex((w) => w === ''),
        )
      ]?.focus();
      return;
    }
    const parts = text.toLowerCase().split(/[\s,;]+/);
    if (parts.length > 1) {
      // A space, Enter or a paste of plain words: complete each word and fill this box
      // and the ones after it, then move on.
      const found = parts.filter((part) => part !== '');
      if (found.length === 0) return;
      setWords((all) => {
        const next = [...all];
        found.forEach((part, i) => {
          if (index + i < count) next[index + i] = completePhraseWord(part) ?? part;
        });
        return next;
      });
      inputs.current[Math.min(index + found.length, count - 1)]?.focus();
      return;
    }
    setWords((all) => all.map((w, i) => (i === index ? text.toLowerCase() : w)));
  };

  /** Fills in a word from its first letters when the person moves on. */
  const complete = (index: number) => {
    setWords((all) => all.map((w, i) => (i === index ? (completePhraseWord(w) ?? w) : w)));
  };

  const filledCount = words.filter((w) => w.trim() !== '').length;
  const unknown = (w: string) => checked && w.trim() !== '' && !isPhraseWord(w);
  const allKnown = words.every((w) => isPhraseWord(w));
  const wrongOrder = checked && filledCount === count && allKnown;

  const check = () => {
    const candidate = words.map((w) => w.trim()).join(' ');
    if (filledCount === count && isValidPhrase(candidate)) setPhrase(candidate);
    else setChecked(true);
  };

  const message = !checked
    ? ''
    : filledCount < count
      ? t('restore.missing', { count: count - filledCount })
      : wrongOrder
        ? t('restore.order')
        : t('restore.wrong');

  return (
    <Page>
      <Text style={styles.title} accessibilityRole="header">
        {t('restore.title')}
      </Text>
      <Text style={styles.body}>{t('restore.body')}</Text>
      <View style={styles.grid}>
        {words.map((word, i) => (
          <View key={i} style={[styles.cell, unknown(word) && styles.cellWrong]}>
            <Text style={styles.number}>{i + 1}</Text>
            <TextInput
              ref={(el) => {
                inputs.current[i] = el;
              }}
              accessibilityLabel={t('setup.confirm.word', { number: i + 1 })}
              value={word}
              onChangeText={(text) => change(i, text)}
              onSubmitEditing={() => {
                complete(i);
                if (i < count - 1) inputs.current[i + 1]?.focus();
              }}
              onBlur={() => complete(i)}
              returnKeyType={i < count - 1 ? 'next' : 'done'}
              blurOnSubmit={false}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              importantForAutofill="no"
              style={styles.input}
            />
          </View>
        ))}
      </View>
      <Text style={styles.error} accessibilityLiveRegion="polite">
        {message}
      </Text>
      <View style={styles.actions}>
        <Button label={t('setup.continue')} onPress={check} disabled={filledCount === 0} />
        <Button label={t('setup.back')} kind="quiet" onPress={() => router.back()} />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.slate,
    textAlign: 'center',
    marginTop: space.lg,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 25,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: space.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.sm,
    marginTop: space.lg,
  },
  cell: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    paddingLeft: space.sm + 4,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(31,30,29,0.3)',
    backgroundColor: colors.paper,
  },
  cellWrong: { borderColor: colors.clayText, borderWidth: 1.5 },
  number: { width: 20, fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.textMuted },
  input: {
    flex: 1,
    minWidth: 0,
    height: 46,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.slate,
  },
  error: {
    minHeight: 22,
    marginTop: space.md,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
    color: colors.clayText,
    textAlign: 'center',
  },
  actions: { gap: space.sm, marginTop: space.sm },
});
