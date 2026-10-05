import { useCallback, useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import {
  aidLimits,
  skillKinds,
  skillLimits,
  skillTopics,
  type AidReply,
  type Skill,
  type SkillKind,
  type SkillTopic,
} from '@tero/protocol';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { Chip, Chips, Field, FieldLabel, SmallButton } from '@/components/Form';
import { ApiError } from '@/lib/api';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';

/** Teaching, wanting to learn, and resources worth sharing. */
export function Skills() {
  const { t } = useLocale();
  const session = useFullSession();
  const connected = session?.connection === 'connected';
  const api = session?.api;
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [kind, setKind] = useState<SkillKind | null>(null);
  const [topic, setTopic] = useState<SkillTopic | null>(null);
  const [writing, setWriting] = useState(false);
  const [problem, setProblem] = useState<string>();

  const load = useCallback(() => {
    const client = api?.();
    if (!client) return;
    client
      .listSkills()
      .then((list) => {
        setSkills(list);
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
    () => (skills ?? []).filter((s) => (!kind || s.kind === kind) && (!topic || s.topic === topic)),
    [skills, kind, topic],
  );

  const guides = (
    <View style={styles.actions}>
      <Button label={t('skills.readGuides')} onPress={() => router.push('/guides')} />
    </View>
  );
  if (!session) return guides;

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
      {guides}
      {writing ? (
        <SkillForm
          onCancel={() => setWriting(false)}
          onSaved={() => {
            setWriting(false);
            load();
          }}
        />
      ) : (
        <View style={styles.actions}>
          <Button
            label={t('skills.post')}
            onPress={() => setWriting(true)}
            kind="secondary"
            disabled={!connected}
          />
        </View>
      )}

      <Chips>
        {skillKinds.map((k) => (
          <Chip
            key={k}
            label={t(`skills.kinds.${k}` as MessageKey)}
            on={kind === k}
            onPress={() => setKind((v) => (v === k ? null : k))}
          />
        ))}
      </Chips>
      <Chips>
        {skillTopics.map((k) => (
          <Chip
            key={k}
            label={t(`skills.topic.${k}` as MessageKey)}
            on={topic === k}
            onPress={() => setTopic((v) => (v === k ? null : k))}
          />
        ))}
      </Chips>

      {!connected && <Text style={styles.note}>{t('dir.offline')}</Text>}
      {problem && <Text style={styles.problem}>{problem}</Text>}

      {skills !== null && shown.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {skills.length === 0 ? t('skills.empty') : t('dir.noMatch')}
          </Text>
        </View>
      )}
      {shown.length > 0 && (
        <View style={styles.list}>
          {shown.map((skill, i) => (
            <SkillRow
              key={skill.id}
              skill={skill}
              first={i === 0}
              canRemove={skill.mine || session.role === 'fool' || session.role === 'council'}
              onReply={(note) => act(() => session.api()!.replySkill(skill.id, note))}
              onRemove={() => act(() => session.api()!.removeSkill(skill.id))}
            />
          ))}
        </View>
      )}
      <Text style={styles.note}>{t('skills.privacy')}</Text>
    </>
  );
}

function SkillRow({
  skill,
  first,
  canRemove,
  onReply,
  onRemove,
}: {
  skill: Skill;
  first: boolean;
  canRemove: boolean;
  onReply: (note: string) => Promise<void>;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  const session = useFullSession();
  const [replying, setReplying] = useState(false);
  const [note, setNote] = useState('');
  const [replies, setReplies] = useState<AidReply[] | null>(null);

  const showReplies = async () => {
    if (replies) return setReplies(null);
    const list = await session
      ?.api()
      ?.skillReplies(skill.id)
      .catch(() => null);
    setReplies(list ?? []);
  };

  const where = [skill.online ? t('skills.online') : '', skill.country].filter(Boolean).join(' · ');

  return (
    <View style={[styles.row, !first && styles.divider]}>
      <Text style={styles.kind}>
        {t(`skills.kind.${skill.kind}` as MessageKey)} ·{' '}
        {t(`skills.topic.${skill.topic}` as MessageKey)}
        {where ? ` · ${where}` : ''}
      </Text>
      <Text style={styles.title}>{skill.title}</Text>
      <Text style={styles.details}>{skill.details}</Text>
      {skill.link !== '' && (
        <Text
          style={styles.link}
          accessibilityRole="link"
          onPress={() => void Linking.openURL(skill.link)}
          selectable
        >
          {skill.link}
        </Text>
      )}

      {replies && (
        <View style={styles.replies}>
          {replies.length === 0 && <Text style={styles.muted}>{t('aid.noReplies')}</Text>}
          {replies.map((r) => (
            <Text key={r.id} style={styles.reply} selectable>
              {r.note}
            </Text>
          ))}
        </View>
      )}

      {replying && (
        <View style={styles.replyForm}>
          <Field
            label={t('aid.replyLabel')}
            value={note}
            onChange={setNote}
            max={aidLimits.reply}
            multiline
            autoCapitalize="sentences"
          />
          <Text style={styles.muted}>{t('aid.replyHint')}</Text>
          <View style={styles.rowButtons}>
            <SmallButton
              label={t('aid.send')}
              on
              onPress={() => {
                if (note.trim() === '') return;
                void onReply(note.trim()).then(() => setReplying(false));
              }}
            />
            <SmallButton label={t('dir.form.cancel')} onPress={() => setReplying(false)} />
          </View>
        </View>
      )}

      <View style={styles.rowButtons}>
        {skill.mine ? (
          <>
            <Text style={styles.count}>
              {t('dir.yours')}
              {skill.kind !== 'resource' ? ` · ${t('aid.replies', { count: skill.replies })}` : ''}
            </Text>
            {skill.replies > 0 && (
              <SmallButton
                label={replies ? t('aid.hideReplies') : t('aid.readReplies')}
                onPress={() => void showReplies()}
              />
            )}
          </>
        ) : skill.replied ? (
          <Text style={styles.count}>✓ {t('aid.replied')}</Text>
        ) : (
          skill.kind !== 'resource' &&
          !replying && (
            <SmallButton
              label={t(skill.kind === 'teach' ? 'skills.wantToLearn' : 'skills.canTeach')}
              onPress={() => setReplying(true)}
            />
          )
        )}
        {canRemove && <SmallButton label={t('dir.remove')} onPress={onRemove} />}
      </View>
    </View>
  );
}

function SkillForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { t } = useLocale();
  const session = useFullSession();
  const [kind, setKind] = useState<SkillKind>('teach');
  const [topic, setTopic] = useState<SkillTopic>('other');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [online, setOnline] = useState(true);
  const [country, setCountry] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  const code = country.trim().toUpperCase();
  const url = link.trim();
  const linkOk = url === '' ? kind !== 'resource' : /^https?:\/\/\S+$/.test(url);
  const ready =
    title.trim() !== '' &&
    details.trim() !== '' &&
    (/^[A-Z]{2}$/.test(code) || (online && code === '')) &&
    linkOk;

  const save = async () => {
    const client = session?.api();
    if (!client || !ready) return;
    setBusy(true);
    setProblem(undefined);
    try {
      await client.addSkill({
        kind,
        topic,
        title: title.trim(),
        details: details.trim(),
        online,
        country: code,
        link: url,
      });
      onSaved();
    } catch (e) {
      setProblem(
        e instanceof ApiError && e.code === 'rate_limited' ? t('aid.limit') : t('dir.failed'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle} accessibilityRole="header">
        {t('skills.post')}
      </Text>
      <Chips>
        {skillKinds.map((k) => (
          <Chip
            key={k}
            role="radio"
            label={t(`skills.kinds.${k}` as MessageKey)}
            on={kind === k}
            onPress={() => setKind(k)}
          />
        ))}
      </Chips>
      <FieldLabel>{t('skills.form.topic')}</FieldLabel>
      <Chips>
        {skillTopics.map((k) => (
          <Chip
            key={k}
            role="radio"
            label={t(`skills.topic.${k}` as MessageKey)}
            on={topic === k}
            onPress={() => setTopic(k)}
          />
        ))}
      </Chips>
      <Field
        label={t('skills.form.title')}
        value={title}
        onChange={setTitle}
        max={skillLimits.title}
        autoCapitalize="sentences"
      />
      <Field
        label={t('skills.form.details')}
        value={details}
        onChange={setDetails}
        max={skillLimits.details}
        multiline
        autoCapitalize="sentences"
      />
      <Checkbox label={t('skills.form.online')} checked={online} onChange={setOnline} />
      <View style={styles.countryField}>
        <Field
          label={online ? t('stories.form.country') : t('dir.form.country')}
          value={country}
          onChange={setCountry}
          max={2}
          autoCapitalize="characters"
        />
      </View>
      <Field
        label={kind === 'resource' ? t('skills.form.link') : t('skills.form.linkOptional')}
        value={link}
        onChange={setLink}
        max={skillLimits.link}
        placeholder="https://"
      />
      {problem && <Text style={styles.problem}>{problem}</Text>}
      <View style={styles.actions}>
        <Button label={t('aid.form.post')} onPress={save} disabled={!ready || busy} />
        <Button label={t('dir.form.cancel')} onPress={onCancel} kind="quiet" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  list: {
    marginTop: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: { padding: space.md, gap: 4 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(31,30,29,0.1)' },
  kind: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.clayText,
    textTransform: 'uppercase',
  },
  title: { fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.slate },
  details: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.slate },
  link: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.clayText },
  replies: {
    marginTop: space.sm,
    padding: space.sm,
    gap: space.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.oatLight,
  },
  reply: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.slate },
  replyForm: { marginTop: space.sm, gap: space.sm },
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
  countryField: { width: 200 },
});
