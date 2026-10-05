import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Chip, Chips, Field, SmallButton } from '@/components/Form';
import { ApiError } from '@/lib/api';
import {
  emptyBook,
  journeyLimits,
  journeyTemplates,
  newId,
  openBook,
  sealBook,
  type Journey,
  type JourneyBook,
  type JourneyTemplate,
} from '@/lib/journeys';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';

type Status = 'loading' | 'ready' | 'locked' | 'offline';

/**
 * The member's own step-by-step plans. Sealed on this device with a key from the 12
 * words; Tero's server stores the sealed box and can't read it.
 */
export function Journeys() {
  const { t } = useLocale();
  const session = useFullSession();
  const connected = session?.connection === 'connected';
  const [book, setBook] = useState<JourneyBook | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [problem, setProblem] = useState<string>();
  const [starting, setStarting] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const version = useRef(0);
  // Saves run one at a time, each carrying the latest book.
  const pending = useRef<JourneyBook | null>(null);
  const saving = useRef(false);

  const api = session?.api;
  const key = session?.journeySecret;

  const load = useCallback(async () => {
    const client = api?.();
    if (!client || !key) return;
    try {
      const res = await client.getJourneys();
      version.current = res.version;
      if (res.box === null) {
        setBook(emptyBook());
        setStatus('ready');
        return;
      }
      const opened = openBook(key, res.box);
      if (opened) {
        setBook(opened);
        setStatus('ready');
      } else {
        setStatus('locked');
      }
    } catch {
      setStatus('offline');
    }
  }, [api, key]);

  useFocusEffect(
    useCallback(() => {
      if (connected) void load();
    }, [connected, load]),
  );

  const flush = useCallback(async () => {
    const client = api?.();
    if (saving.current || !client || !key) return;
    saving.current = true;
    try {
      while (pending.current) {
        const next = pending.current;
        pending.current = null;
        const res = await client.saveJourneys(sealBook(key, next), version.current);
        version.current = res.version;
      }
      setProblem(undefined);
    } catch (e) {
      pending.current = null;
      if (e instanceof ApiError && e.code === 'conflict') {
        setProblem(t('journeys.conflict'));
        await load();
      } else {
        setProblem(t('journeys.saveFailed'));
      }
    } finally {
      saving.current = false;
    }
  }, [api, key, load, t]);

  const change = (update: (journeys: Journey[]) => Journey[]) => {
    setBook((current) => {
      if (!current) return current;
      const next: JourneyBook = { v: 1, journeys: update(current.journeys) };
      pending.current = next;
      void flush();
      return next;
    });
  };

  const editJourney = (id: string, edit: (j: Journey) => Journey) =>
    change((all) => all.map((j) => (j.id === id ? edit(j) : j)));

  if (!session) return <Text style={styles.note}>{t('dir.membersOnly')}</Text>;

  const start = (title: string, steps: string[]) => {
    const id = newId();
    change((all) => [
      ...all,
      {
        id,
        title: title.slice(0, journeyLimits.title),
        note: '',
        steps: steps.map((text) => ({ id: newId(), text, done: false })),
      },
    ]);
    setStarting(false);
    setOpen(id);
  };

  return (
    <>
      <View style={styles.callout}>
        <Text style={styles.calloutText}>{t('journeys.privacy')}</Text>
      </View>

      {!connected && <Text style={styles.note}>{t('dir.offline')}</Text>}
      {status === 'offline' && <Text style={styles.problem}>{t('dir.failed')}</Text>}
      {status === 'locked' && <Text style={styles.problem}>{t('journeys.locked')}</Text>}
      {problem && <Text style={styles.problem}>{problem}</Text>}

      {book && book.journeys.length === 0 && !starting && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('journeys.empty')}</Text>
        </View>
      )}

      {book?.journeys.map((journey) => (
        <JourneyCard
          key={journey.id}
          journey={journey}
          open={open === journey.id}
          onToggleOpen={() => setOpen((v) => (v === journey.id ? null : journey.id))}
          onEdit={(edit) => editJourney(journey.id, edit)}
          onDelete={() => change((all) => all.filter((j) => j.id !== journey.id))}
        />
      ))}

      {book &&
        status === 'ready' &&
        (starting ? (
          <StartForm onStart={start} onCancel={() => setStarting(false)} />
        ) : (
          <View style={styles.actions}>
            <Button
              label={t('journeys.start')}
              onPress={() => setStarting(true)}
              kind="secondary"
              disabled={!connected || book.journeys.length >= journeyLimits.journeys}
            />
          </View>
        ))}
    </>
  );
}

function JourneyCard({
  journey,
  open,
  onToggleOpen,
  onEdit,
  onDelete,
}: {
  journey: Journey;
  open: boolean;
  onToggleOpen: () => void;
  onEdit: (edit: (j: Journey) => Journey) => void;
  onDelete: () => void;
}) {
  const { t } = useLocale();
  const [step, setStep] = useState('');
  const [note, setNote] = useState(journey.note);
  const [confirm, setConfirm] = useState(false);
  const done = journey.steps.filter((s) => s.done).length;
  const total = journey.steps.length;

  const addStep = () => {
    const text = step.trim();
    if (!text || total >= journeyLimits.steps) return;
    onEdit((j) => ({ ...j, steps: [...j.steps, { id: newId(), text, done: false }] }));
    setStep('');
  };

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggleOpen}
        style={styles.cardHead}
      >
        <View style={styles.flex}>
          <Text style={styles.title}>{journey.title}</Text>
          <Text style={styles.progressText}>{t('journeys.progress', { done, total })}</Text>
        </View>
        <Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
      </Pressable>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: total ? `${(done / total) * 100}%` : '0%' }]} />
      </View>

      {open && (
        <View style={styles.steps}>
          {journey.steps.map((s, i) => (
            <View key={s.id} style={styles.step}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: s.done }}
                accessibilityLabel={s.text}
                onPress={() =>
                  onEdit((j) => ({
                    ...j,
                    steps: j.steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)),
                  }))
                }
                style={[styles.dot, s.done && styles.dotDone]}
              >
                <Text style={[styles.dotText, s.done && styles.dotTextDone]}>
                  {s.done ? '✓' : i + 1}
                </Text>
              </Pressable>
              <Text style={[styles.stepText, s.done && styles.stepDone]}>{s.text}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('journeys.removeStep')}
                onPress={() =>
                  onEdit((j) => ({ ...j, steps: j.steps.filter((x) => x.id !== s.id) }))
                }
                hitSlop={8}
              >
                <Text style={styles.remove}>×</Text>
              </Pressable>
            </View>
          ))}
          <View style={styles.addRow}>
            <TextInput
              value={step}
              onChangeText={setStep}
              onSubmitEditing={addStep}
              placeholder={t('journeys.addStep')}
              placeholderTextColor={colors.textMuted}
              maxLength={journeyLimits.step}
              accessibilityLabel={t('journeys.addStep')}
              style={styles.addInput}
            />
            <SmallButton label={t('journeys.add')} onPress={addStep} />
          </View>
          <Field
            label={t('journeys.note')}
            value={note}
            onChange={setNote}
            max={journeyLimits.note}
            multiline
            autoCapitalize="sentences"
          />
          <View style={styles.rowButtons}>
            {note !== journey.note && (
              <SmallButton
                label={t('journeys.saveNote')}
                on
                onPress={() => onEdit((j) => ({ ...j, note }))}
              />
            )}
            <SmallButton
              label={confirm ? t('journeys.confirmDelete') : t('journeys.delete')}
              onPress={() => (confirm ? onDelete() : setConfirm(true))}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function StartForm({
  onStart,
  onCancel,
}: {
  onStart: (title: string, steps: string[]) => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const [template, setTemplate] = useState<JourneyTemplate | 'blank'>('care');
  const [title, setTitle] = useState('');

  const go = () => {
    if (template === 'blank') {
      if (title.trim()) onStart(title.trim(), []);
      return;
    }
    const steps = Array.from({ length: journeyTemplates[template] }, (_, i) =>
      t(`journeys.tpl.${template}.${i + 1}` as MessageKey),
    );
    onStart(t(`journeys.tpl.${template}` as MessageKey), steps);
  };

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle} accessibilityRole="header">
        {t('journeys.start')}
      </Text>
      <Chips>
        {(Object.keys(journeyTemplates) as JourneyTemplate[]).map((k) => (
          <Chip
            key={k}
            role="radio"
            label={t(`journeys.tpl.${k}` as MessageKey)}
            on={template === k}
            onPress={() => setTemplate(k)}
          />
        ))}
        <Chip
          role="radio"
          label={t('journeys.blank')}
          on={template === 'blank'}
          onPress={() => setTemplate('blank')}
        />
      </Chips>
      {template === 'blank' ? (
        <Field
          label={t('journeys.title')}
          value={title}
          onChange={setTitle}
          max={journeyLimits.title}
          autoCapitalize="sentences"
        />
      ) : (
        <View style={styles.preview}>
          {Array.from({ length: journeyTemplates[template] }, (_, i) => (
            <Text key={i} style={styles.previewStep}>
              {i + 1}. {t(`journeys.tpl.${template}.${i + 1}` as MessageKey)}
            </Text>
          ))}
          <Text style={styles.muted}>{t('journeys.editLater')}</Text>
        </View>
      )}
      <View style={styles.actions}>
        <Button
          label={t('journeys.begin')}
          onPress={go}
          disabled={template === 'blank' && title.trim() === ''}
        />
        <Button label={t('dir.form.cancel')} onPress={onCancel} kind="quiet" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  callout: {
    marginTop: space.lg,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.oatLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.clay,
  },
  calloutText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.slate },
  note: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: space.md,
    textAlign: 'center',
  },
  problem: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.clayText,
    marginTop: space.md,
  },
  empty: {
    marginTop: space.md,
    padding: space.lg,
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(31,30,29,0.18)',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    marginTop: space.md,
    padding: space.md,
    gap: space.sm,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.slate },
  progressText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  chevron: { fontFamily: fonts.body, fontSize: 20, color: colors.textMuted },
  bar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(31,30,29,0.08)', overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: colors.clay },
  steps: { gap: space.sm, marginTop: space.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.slate,
  },
  dotDone: { backgroundColor: colors.slate },
  dotText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.slate },
  dotTextDone: { color: colors.ivory },
  stepText: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.slate },
  stepDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  remove: { fontFamily: fonts.body, fontSize: 20, color: colors.textMuted, paddingHorizontal: 4 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  addInput: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: space.sm + 4,
    borderRadius: radii.sm,
    backgroundColor: colors.ivory,
    borderWidth: 1,
    borderColor: 'rgba(31,30,29,0.15)',
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.slate,
  },
  rowButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  actions: { gap: space.sm, marginTop: space.lg },
  form: {
    marginTop: space.lg,
    padding: space.md,
    gap: space.sm,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  formTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.slate },
  preview: { gap: 6, marginTop: space.sm },
  previewStep: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.slate },
  muted: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
});
