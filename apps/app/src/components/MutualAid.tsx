import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import {
  aidCategories,
  aidLimits,
  type AidCategory,
  type AidKind,
  type AidPost,
  type AidReply,
} from '@tero/protocol';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Chip, Chips, Field, FieldLabel, SmallButton } from '@/components/Form';
import { ApiError } from '@/lib/api';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';

type Show = 'all' | 'request' | 'offer' | 'mine';

/** Asking for help and offering it. Replies go only to the person who posted. */
export function MutualAid({ create }: { create?: AidKind }) {
  const { t } = useLocale();
  const session = useFullSession();
  const connected = session?.connection === 'connected';
  const api = session?.api;
  const [posts, setPosts] = useState<AidPost[] | null>(null);
  const [show, setShow] = useState<Show>('all');
  const [writing, setWriting] = useState<AidKind | null>(create ?? null);
  const [problem, setProblem] = useState<string>();

  const load = useCallback(() => {
    const client = api?.();
    if (!client) return;
    client
      .listAid()
      .then((list) => {
        setPosts(list);
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
    () =>
      (posts ?? []).filter((p) => {
        if (show === 'mine') return p.mine;
        if (!p.open) return false;
        return show === 'all' || p.kind === show;
      }),
    [posts, show],
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

  const filters: Array<[Show, MessageKey]> = [
    ['all', 'aid.all'],
    ['request', 'aid.requests'],
    ['offer', 'aid.offers'],
    ['mine', 'aid.mine'],
  ];

  return (
    <>
      {writing ? (
        <AidForm
          kind={writing}
          onCancel={() => setWriting(null)}
          onSaved={() => {
            setWriting(null);
            setShow('mine');
            load();
          }}
        />
      ) : (
        <View style={styles.twoButtons}>
          <View style={styles.flex}>
            <Button
              label={t('aid.request')}
              onPress={() => setWriting('request')}
              disabled={!connected}
            />
          </View>
          <View style={styles.flex}>
            <Button
              label={t('aid.offer')}
              onPress={() => setWriting('offer')}
              kind="secondary"
              disabled={!connected}
            />
          </View>
        </View>
      )}

      <Chips>
        {filters.map(([key, label]) => (
          <Chip
            key={key}
            role="radio"
            label={t(label)}
            on={show === key}
            onPress={() => setShow(key)}
          />
        ))}
      </Chips>

      {!connected && <Text style={styles.note}>{t('dir.offline')}</Text>}
      {problem && <Text style={styles.problem}>{problem}</Text>}

      {posts !== null && shown.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t(show === 'mine' ? 'aid.emptyMine' : 'aid.empty')}</Text>
        </View>
      )}
      {shown.length > 0 && (
        <View style={styles.list}>
          {shown.map((post, i) => (
            <AidRow
              key={post.id}
              post={post}
              first={i === 0}
              canRemove={post.mine || session.role === 'fool' || session.role === 'council'}
              onReply={(note) => act(() => session.api()!.replyAid(post.id, note))}
              onClose={() => act(() => session.api()!.closeAid(post.id))}
              onRemove={() => act(() => session.api()!.removeAid(post.id))}
            />
          ))}
        </View>
      )}
      <Text style={styles.note}>{t('aid.privacy')}</Text>
    </>
  );
}

function AidRow({
  post,
  first,
  canRemove,
  onReply,
  onClose,
  onRemove,
}: {
  post: AidPost;
  first: boolean;
  canRemove: boolean;
  onReply: (note: string) => Promise<void>;
  onClose: () => void;
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
      ?.aidReplies(post.id)
      .catch(() => null);
    setReplies(list ?? []);
  };

  return (
    <View style={[styles.post, !first && styles.divider]}>
      <Text style={[styles.kind, post.kind === 'offer' && styles.kindOffer]}>
        {t(post.kind === 'request' ? 'aid.kind.request' : 'aid.kind.offer')} ·{' '}
        {t(`aid.cat.${post.category}` as MessageKey)}
      </Text>
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.where}>
        {post.city} · {post.country}
        {post.open ? '' : ` · ${t('aid.done')}`}
      </Text>
      <Text style={styles.details}>{post.details}</Text>

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
        {post.mine ? (
          <>
            <Text style={styles.count}>
              {t('dir.yours')} · {t('aid.replies', { count: post.replies })}
            </Text>
            {post.replies > 0 && (
              <SmallButton
                label={replies ? t('aid.hideReplies') : t('aid.readReplies')}
                onPress={() => void showReplies()}
              />
            )}
            {post.open && <SmallButton label={t('aid.markDone')} onPress={onClose} />}
          </>
        ) : post.replied ? (
          <Text style={styles.count}>✓ {t('aid.replied')}</Text>
        ) : (
          !replying && (
            <SmallButton
              label={t(post.kind === 'request' ? 'aid.canHelp' : 'aid.wouldLike')}
              onPress={() => setReplying(true)}
            />
          )
        )}
        {canRemove && <SmallButton label={t('dir.remove')} onPress={onRemove} />}
      </View>
    </View>
  );
}

function AidForm({
  kind,
  onCancel,
  onSaved,
}: {
  kind: AidKind;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t } = useLocale();
  const session = useFullSession();
  const [category, setCategory] = useState<AidCategory>('other');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  const code = country.trim().toUpperCase();
  const ready =
    title.trim() !== '' && details.trim() !== '' && /^[A-Z]{2}$/.test(code) && city.trim() !== '';

  const save = async () => {
    const client = session?.api();
    if (!client || !ready) return;
    setBusy(true);
    setProblem(undefined);
    try {
      await client.addAid({
        kind,
        category,
        title: title.trim(),
        details: details.trim(),
        country: code,
        city: city.trim(),
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
        {t(kind === 'request' ? 'aid.request' : 'aid.offer')}
      </Text>
      <FieldLabel>{t('aid.form.category')}</FieldLabel>
      <Chips>
        {aidCategories.map((c) => (
          <Chip
            key={c}
            role="radio"
            label={t(`aid.cat.${c}` as MessageKey)}
            on={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </Chips>
      <Field
        label={t('aid.form.title')}
        value={title}
        onChange={setTitle}
        max={aidLimits.title}
        autoCapitalize="sentences"
      />
      <Field
        label={t('aid.form.details')}
        value={details}
        onChange={setDetails}
        max={aidLimits.details}
        multiline
        autoCapitalize="sentences"
      />
      <View style={styles.row}>
        <View style={styles.countryField}>
          <Field
            label={t('dir.form.country')}
            value={country}
            onChange={setCountry}
            max={2}
            autoCapitalize="characters"
          />
        </View>
        <View style={styles.flex}>
          <Field label={t('dir.form.city')} value={city} onChange={setCity} max={aidLimits.city} />
        </View>
      </View>
      <Text style={styles.muted}>{t('aid.form.hint')}</Text>
      {problem && <Text style={styles.problem}>{problem}</Text>}
      <View style={styles.actions}>
        <Button label={t('aid.form.post')} onPress={save} disabled={!ready || busy} />
        <Button label={t('dir.form.cancel')} onPress={onCancel} kind="quiet" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  twoButtons: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  flex: { flex: 1 },
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
  post: { padding: space.md, gap: 4 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(31,30,29,0.1)' },
  kind: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.clayText,
    textTransform: 'uppercase',
  },
  kindOffer: { color: colors.slate },
  title: { fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.slate },
  where: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  details: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.slate },
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
  row: { flexDirection: 'row', gap: space.sm },
  countryField: { width: 110 },
  actions: { gap: space.sm, marginTop: space.lg },
});
