import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { storyLimits, storyTopics, type Story, type StoryTopic } from '@tero/protocol';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Chip, Chips, Field, FieldLabel, SmallButton } from '@/components/Form';
import { ApiError } from '@/lib/api';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';

/** How much of a story shows before "Read more". */
const excerpt = 280;

/** Firsthand experiences, shared without a name. Personal, not advice. */
export function Stories({ create = false }: { create?: boolean }) {
  const { t } = useLocale();
  const session = useFullSession();
  const connected = session?.connection === 'connected';
  const api = session?.api;
  const [stories, setStories] = useState<Story[] | null>(null);
  const [topic, setTopic] = useState<StoryTopic | null>(null);
  const [writing, setWriting] = useState(create);
  const [problem, setProblem] = useState<string>();

  const load = useCallback(() => {
    const client = api?.();
    if (!client) return;
    client
      .listStories()
      .then((list) => {
        setStories(list);
        setProblem(undefined);
      })
      .catch(() => setProblem(t('dir.failed')));
  }, [api, t]);

  useFocusEffect(
    useCallback(() => {
      if (connected) load();
    }, [connected, load]),
  );

  const shown = useMemo(
    () => (stories ?? []).filter((s) => !topic || s.topic === topic),
    [stories, topic],
  );

  if (!session) return <Text style={styles.note}>{t('dir.membersOnly')}</Text>;

  const act = async (run: () => Promise<unknown>) => {
    try {
      await run();
      load();
    } catch {
      setProblem(t('dir.failed'));
    }
  };

  return (
    <>
      <View style={styles.callout}>
        <Text style={styles.calloutText}>{t('stories.note')}</Text>
      </View>

      {writing ? (
        <StoryForm
          onCancel={() => setWriting(false)}
          onSaved={() => {
            setWriting(false);
            load();
          }}
        />
      ) : (
        <View style={styles.actions}>
          <Button
            label={t('stories.share')}
            onPress={() => setWriting(true)}
            kind="secondary"
            disabled={!connected}
          />
        </View>
      )}

      <Chips>
        {storyTopics.map((k) => (
          <Chip
            key={k}
            label={t(`stories.topic.${k}` as MessageKey)}
            on={topic === k}
            onPress={() => setTopic((v) => (v === k ? null : k))}
          />
        ))}
      </Chips>

      {!connected && <Text style={styles.note}>{t('dir.offline')}</Text>}
      {problem && <Text style={styles.problem}>{problem}</Text>}

      {stories !== null && shown.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {stories.length === 0 ? t('stories.empty') : t('dir.noMatch')}
          </Text>
        </View>
      )}
      {shown.map((story) => (
        <StoryCard
          key={story.id}
          story={story}
          canRemove={story.mine || session.role === 'fool' || session.role === 'council'}
          onThank={() => act(() => session.api()!.thankStory(story.id, !story.thanked))}
          onRemove={() => act(() => session.api()!.removeStory(story.id))}
        />
      ))}
      <Text style={styles.note}>{t('stories.privacy')}</Text>
    </>
  );
}

function StoryCard({
  story,
  canRemove,
  onThank,
  onRemove,
}: {
  story: Story;
  canRemove: boolean;
  onThank: () => void;
  onRemove: () => void;
}) {
  const { t, locale } = useLocale();
  // Stories with a content note stay folded until the reader chooses to open them.
  const [open, setOpen] = useState(story.warning === '');
  const [full, setFull] = useState(false);
  const long = story.text.length > excerpt;
  const when = new Date(story.addedOn).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return (
    <View style={styles.card}>
      <Text style={styles.kind}>
        {t(`stories.topic.${story.topic}` as MessageKey)} · {when}
        {story.country ? ` · ${story.country}` : ''}
      </Text>
      <Text style={styles.title}>{story.title}</Text>
      {!open ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.warning, pressed && styles.pressed]}
        >
          <Text style={styles.warningText}>
            {t('stories.warningShown', { note: story.warning })}
          </Text>
          <Text style={styles.warningAction}>{t('stories.open')}</Text>
        </Pressable>
      ) : (
        <>
          {story.warning !== '' && (
            <Text style={styles.muted}>{t('stories.warningShown', { note: story.warning })}</Text>
          )}
          <Text style={styles.text}>
            {long && !full ? `${story.text.slice(0, excerpt).trimEnd()}…` : story.text}
          </Text>
          {long && (
            <Pressable accessibilityRole="button" onPress={() => setFull((v) => !v)}>
              <Text style={styles.more}>{full ? t('stories.less') : t('stories.more')}</Text>
            </Pressable>
          )}
        </>
      )}
      <View style={styles.rowButtons}>
        <Text style={styles.count}>
          {story.mine ? `${t('dir.yours')} · ` : ''}
          {t('stories.thanks', { count: story.thanks })}
        </Text>
        {!story.mine && (
          <SmallButton
            label={story.thanked ? `✓ ${t('stories.thanked')}` : t('stories.thank')}
            on={story.thanked}
            onPress={onThank}
          />
        )}
        {canRemove && <SmallButton label={t('dir.remove')} onPress={onRemove} />}
      </View>
    </View>
  );
}

function StoryForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { t } = useLocale();
  const session = useFullSession();
  const [topic, setTopic] = useState<StoryTopic>('other');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [warning, setWarning] = useState('');
  const [country, setCountry] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  const code = country.trim().toUpperCase();
  const ready =
    title.trim() !== '' && text.trim() !== '' && (code === '' || /^[A-Z]{2}$/.test(code));

  const save = async () => {
    const client = session?.api();
    if (!client || !ready) return;
    setBusy(true);
    setProblem(undefined);
    try {
      await client.addStory({
        topic,
        title: title.trim(),
        text: text.trim(),
        warning: warning.trim(),
        country: code,
      });
      onSaved();
    } catch (e) {
      setProblem(
        e instanceof ApiError && e.code === 'rate_limited' ? t('stories.limit') : t('dir.failed'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle} accessibilityRole="header">
        {t('stories.share')}
      </Text>
      <Text style={styles.muted}>{t('stories.form.hint')}</Text>
      <FieldLabel>{t('stories.form.topic')}</FieldLabel>
      <Chips>
        {storyTopics.map((k) => (
          <Chip
            key={k}
            role="radio"
            label={t(`stories.topic.${k}` as MessageKey)}
            on={topic === k}
            onPress={() => setTopic(k)}
          />
        ))}
      </Chips>
      <Field
        label={t('stories.form.title')}
        value={title}
        onChange={setTitle}
        max={storyLimits.title}
        autoCapitalize="sentences"
      />
      <Field
        label={t('stories.form.text')}
        value={text}
        onChange={setText}
        max={storyLimits.text}
        multiline
        autoCapitalize="sentences"
      />
      <Field
        label={t('stories.form.warning')}
        value={warning}
        onChange={setWarning}
        max={storyLimits.warning}
      />
      <View style={styles.countryField}>
        <Field
          label={t('stories.form.country')}
          value={country}
          onChange={setCountry}
          max={2}
          autoCapitalize="characters"
        />
      </View>
      {problem && <Text style={styles.problem}>{problem}</Text>}
      <View style={styles.actions}>
        <Button label={t('aid.form.post')} onPress={save} disabled={!ready || busy} />
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
    gap: 6,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  kind: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.clayText,
    textTransform: 'uppercase',
  },
  title: { fontFamily: fonts.display, fontSize: 21, color: colors.slate },
  text: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25, color: colors.slate },
  more: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.clayText },
  warning: {
    padding: space.sm + 4,
    gap: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.oatLight,
  },
  warningText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate },
  warningAction: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.clayText },
  pressed: { opacity: 0.7 },
  muted: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  rowButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.sm,
  },
  count: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
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
  countryField: { width: 160 },
});
