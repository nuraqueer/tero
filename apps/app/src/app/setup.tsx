import { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { createPhrase, normalizePhrase, randomBytes } from '@tero/crypto';
import { colors, fonts, radii, space, touchTarget } from '@tero/ui';
import { Button } from '@/components/Button';
import { Code } from '@/components/Code';
import { Page } from '@/components/Page';
import { PasscodePad } from '@/components/PasscodePad';
import { useLocale } from '@/lib/locale';
import { useSession } from '@/lib/session';

type Step =
  | { name: 'code' }
  | { name: 'phrase' }
  | { name: 'confirm' }
  | { name: 'passcode' }
  | { name: 'passcodeRepeat'; passcode: string }
  | { name: 'decoy'; passcode: string }
  | { name: 'decoyRepeat'; passcode: string; decoy: string }
  | { name: 'saving' };

/** Three different word places to check, in order, for example [2, 7, 11]. */
function pickPlaces(): number[] {
  const places = new Set<number>();
  for (const byte of randomBytes(32)) {
    if (places.size === 3) break;
    places.add(byte % 12);
  }
  return [...places].sort((a, b) => a - b);
}

export default function Setup() {
  const { t } = useLocale();
  const { state, finishSetup } = useSession();
  // Joining with a card: the keys were made when the card was claimed. Without a card
  // (only the founder, before the first card exists) new keys are made here.
  const join = state.status === 'new' ? state.join : null;
  const phrase = useMemo(() => join?.phrase ?? createPhrase(), [join]);
  const words = phrase.split(' ');
  const [step, setStep] = useState<Step>(join ? { name: 'code' } : { name: 'phrase' });
  const [message, setMessage] = useState<string>();
  // Bumped to clear the keypad after a mismatch.
  const [resets, setResets] = useState(0);

  const go = (next: Step, note?: string) => {
    setMessage(note);
    setResets((n) => n + 1);
    setStep(next);
  };

  const save = async (passcode: string, decoy: string) => {
    go({ name: 'saving' });
    try {
      await finishSetup(phrase, passcode, decoy);
    } catch {
      go({ name: 'passcode' }, t('setup.failed'));
    }
  };

  switch (step.name) {
    case 'code':
      return (
        <Page center>
          <Text style={styles.title} accessibilityRole="header">
            {t('setup.code.title')}
          </Text>
          <Text style={styles.body}>{t('setup.code.body')}</Text>
          <View style={styles.code}>
            <Code code={join?.code ?? ''} />
          </View>
          <View style={styles.actions}>
            <Button label={t('setup.continue')} onPress={() => go({ name: 'phrase' })} />
          </View>
        </Page>
      );

    case 'phrase':
      return (
        <Page>
          <Text style={styles.title} accessibilityRole="header">
            {t('setup.phrase.title')}
          </Text>
          <Text style={styles.body}>{t('setup.phrase.body')}</Text>
          <View style={styles.words}>
            {words.map((word, i) => (
              <View key={i} style={styles.word}>
                <Text style={styles.wordNumber}>{i + 1}</Text>
                <Text style={styles.wordText} selectable={false}>
                  {word}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.actions}>
            <Button label={t('setup.phrase.done')} onPress={() => go({ name: 'confirm' })} />
          </View>
        </Page>
      );

    case 'confirm':
      return (
        <ConfirmWords
          words={words}
          onBack={() => go({ name: 'phrase' })}
          onDone={() => go({ name: 'passcode' })}
        />
      );

    case 'passcode':
    case 'passcodeRepeat':
    case 'decoy':
    case 'decoyRepeat': {
      const decoyStep = step.name === 'decoy' || step.name === 'decoyRepeat';
      const repeat = step.name === 'passcodeRepeat' || step.name === 'decoyRepeat';
      const submit = (code: string) => {
        if (step.name === 'passcode') go({ name: 'passcodeRepeat', passcode: code });
        else if (step.name === 'passcodeRepeat') {
          if (code === step.passcode) go({ name: 'decoy', passcode: code });
          else go({ name: 'passcode' }, t('setup.passcode.mismatch'));
        } else if (step.name === 'decoy') {
          if (code === step.passcode)
            go({ name: 'decoy', passcode: step.passcode }, t('setup.decoy.sameAsReal'));
          else go({ name: 'decoyRepeat', passcode: step.passcode, decoy: code });
        } else if (code === step.decoy) save(step.passcode, code);
        else go({ name: 'decoy', passcode: step.passcode }, t('setup.passcode.mismatch'));
      };
      return (
        <Page>
          <Text style={styles.title} accessibilityRole="header">
            {decoyStep ? t('setup.decoy.title') : t('setup.passcode.title')}
          </Text>
          <Text style={styles.body}>
            {repeat
              ? t(decoyStep ? 'setup.decoy.repeat' : 'setup.passcode.repeat')
              : t(
                  decoyStep
                    ? 'setup.decoy.body'
                    : Platform.OS === 'web'
                      ? 'setup.passcode.bodyWeb'
                      : 'setup.passcode.body',
                )}
          </Text>
          <PasscodePad
            key={step.name}
            onSubmit={submit}
            message={message}
            resetKey={resets}
            choosing={!repeat}
          />
        </Page>
      );
    }

    case 'saving':
      return (
        <Page center>
          <Text style={[styles.body, styles.centered]} accessibilityLiveRegion="polite">
            {t('setup.saving')}
          </Text>
        </Page>
      );
  }
}

function ConfirmWords({
  words,
  onBack,
  onDone,
}: {
  words: string[];
  onBack: () => void;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const places = useMemo(pickPlaces, []);
  const [typed, setTyped] = useState<string[]>(() => places.map(() => ''));
  const [wrong, setWrong] = useState(false);

  const check = () => {
    const ok = places.every((place, i) => normalizePhrase(typed[i] ?? '') === words[place]);
    if (ok) onDone();
    else setWrong(true);
  };

  return (
    <Page>
      <Text style={styles.title} accessibilityRole="header">
        {t('setup.confirm.title')}
      </Text>
      <Text style={styles.body}>{t('setup.confirm.body')}</Text>
      <View style={styles.fields}>
        {places.map((place, i) => (
          <View key={place} style={styles.field}>
            <Text style={styles.fieldLabel} nativeID={`word-${place}`}>
              {t('setup.confirm.word', { number: place + 1 })}
            </Text>
            <TextInput
              accessibilityLabelledBy={`word-${place}`}
              accessibilityLabel={t('setup.confirm.word', { number: place + 1 })}
              value={typed[i]}
              onChangeText={(text) => {
                setWrong(false);
                setTyped((all) => all.map((v, j) => (j === i ? text : v)));
              }}
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
        {wrong ? t('setup.confirm.wrong') : ''}
      </Text>
      <View style={styles.actions}>
        <Button label={t('setup.continue')} onPress={check} />
        <Button label={t('setup.back')} onPress={onBack} kind="quiet" />
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
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 25,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: space.md,
  },
  centered: { marginTop: 0 },
  code: { marginTop: space.xl },
  words: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.lg,
    justifyContent: 'center',
  },
  word: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.sm,
    width: '31%',
    minWidth: 120,
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  wordNumber: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, minWidth: 18 },
  wordText: { fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.slate },
  fields: { gap: space.md, marginTop: space.lg },
  field: { gap: space.xs },
  fieldLabel: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.slate },
  input: {
    minHeight: touchTarget + 4,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.paper,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.slate,
  },
  error: {
    minHeight: 22,
    marginTop: space.md,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.clayText,
    textAlign: 'center',
  },
  actions: { gap: space.sm + 4, marginTop: space.xl },
});
