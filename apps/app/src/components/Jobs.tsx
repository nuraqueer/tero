import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import { jobLimits, jobTypes, type Job, type JobType } from '@tero/protocol';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { Chip, Chips, Field, FieldLabel, SmallButton } from '@/components/Form';
import { ApiError } from '@/lib/api';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';

/** Openings, freelance work and mentoring shared by members. */
export function Jobs() {
  const { t } = useLocale();
  const session = useFullSession();
  const connected = session?.connection === 'connected';
  const api = session?.api;
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [query, setQuery] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [type, setType] = useState<JobType | null>(null);
  const [writing, setWriting] = useState(false);
  const [problem, setProblem] = useState<string>();

  const load = useCallback(() => {
    const client = api?.();
    if (!client) return;
    client
      .listJobs()
      .then((list) => {
        setJobs(list);
        setProblem(undefined);
      })
      .catch(() => setProblem(t('dir.failed')));
  }, [api, t]);

  useFocusEffect(
    useCallback(() => {
      if (connected) load();
    }, [connected, load]),
  );

  const shown = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (jobs ?? []).filter((j) => {
      if (remoteOnly && !j.remote) return false;
      if (type && j.type !== type) return false;
      const text =
        `${j.title} ${j.organisation} ${j.details} ${j.city} ${j.country} ${j.remote ? 'remote' : ''}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [jobs, query, remoteOnly, type]);

  if (!session) return <Text style={styles.note}>{t('dir.membersOnly')}</Text>;

  const remove = async (id: string) => {
    try {
      await session.api()!.removeJob(id);
      load();
    } catch {
      setProblem(t('dir.failed'));
    }
  };

  return (
    <>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('jobs.search')}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        style={styles.search}
        accessibilityLabel={t('jobs.search')}
      />
      <Chips>
        <Chip label={t('jobs.remote')} on={remoteOnly} onPress={() => setRemoteOnly((v) => !v)} />
        {jobTypes.map((k) => (
          <Chip
            key={k}
            label={t(`jobs.type.${k}` as MessageKey)}
            on={type === k}
            onPress={() => setType((v) => (v === k ? null : k))}
          />
        ))}
      </Chips>

      {!connected && <Text style={styles.note}>{t('dir.offline')}</Text>}
      {problem && <Text style={styles.problem}>{problem}</Text>}

      {jobs !== null && shown.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {jobs.length === 0 ? t('jobs.empty') : t('dir.noMatch')}
          </Text>
        </View>
      )}
      {shown.length > 0 && (
        <View style={styles.list}>
          {shown.map((job, i) => (
            <View key={job.id} style={[styles.job, i > 0 && styles.divider]}>
              <Text style={styles.kind}>
                {t(`jobs.type.${job.type}` as MessageKey)} · {job.remote ? t('jobs.remoteTag') : ''}
                {job.remote && job.country ? ' · ' : ''}
                {[job.city, job.country].filter(Boolean).join(', ')}
              </Text>
              <Text style={styles.title}>{job.title}</Text>
              {(job.organisation !== '' || job.pay !== '') && (
                <Text style={styles.sub}>
                  {[job.organisation, job.pay].filter(Boolean).join(' · ')}
                </Text>
              )}
              <Text style={styles.details}>{job.details}</Text>
              <Text style={styles.apply} selectable>
                {t('jobs.applyLabel')}: {job.apply}
              </Text>
              {(job.mine || session.role === 'fool' || session.role === 'council') && (
                <View style={styles.rowButtons}>
                  {job.mine && <Text style={styles.count}>{t('dir.yours')}</Text>}
                  <SmallButton label={t('dir.remove')} onPress={() => void remove(job.id)} />
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {writing ? (
        <JobForm
          onCancel={() => setWriting(false)}
          onSaved={() => {
            setWriting(false);
            load();
          }}
        />
      ) : (
        <View style={styles.actions}>
          <Button
            label={t('jobs.post')}
            onPress={() => setWriting(true)}
            kind="secondary"
            disabled={!connected}
          />
        </View>
      )}
      <Text style={styles.note}>{t('jobs.privacy')}</Text>
    </>
  );
}

function JobForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { t } = useLocale();
  const session = useFullSession();
  const [type, setType] = useState<JobType>('job');
  const [title, setTitle] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [details, setDetails] = useState('');
  const [remote, setRemote] = useState(false);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [pay, setPay] = useState('');
  const [apply, setApply] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  const code = country.trim().toUpperCase();
  const countryOk = /^[A-Z]{2}$/.test(code) || (remote && code === '');
  const ready = title.trim() !== '' && details.trim() !== '' && apply.trim() !== '' && countryOk;

  const save = async () => {
    const client = session?.api();
    if (!client || !ready) return;
    setBusy(true);
    setProblem(undefined);
    try {
      await client.addJob({
        type,
        title: title.trim(),
        organisation: organisation.trim(),
        details: details.trim(),
        remote,
        country: code,
        city: city.trim(),
        pay: pay.trim(),
        apply: apply.trim(),
      });
      onSaved();
    } catch (e) {
      setProblem(
        e instanceof ApiError && e.code === 'rate_limited' ? t('jobs.limit') : t('dir.failed'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle} accessibilityRole="header">
        {t('jobs.post')}
      </Text>
      <FieldLabel>{t('jobs.form.type')}</FieldLabel>
      <Chips>
        {jobTypes.map((k) => (
          <Chip
            key={k}
            role="radio"
            label={t(`jobs.type.${k}` as MessageKey)}
            on={type === k}
            onPress={() => setType(k)}
          />
        ))}
      </Chips>
      <Field
        label={t('jobs.form.title')}
        value={title}
        onChange={setTitle}
        max={jobLimits.title}
        autoCapitalize="sentences"
      />
      <Field
        label={t('jobs.form.organisation')}
        value={organisation}
        onChange={setOrganisation}
        max={jobLimits.organisation}
      />
      <Field
        label={t('jobs.form.details')}
        value={details}
        onChange={setDetails}
        max={jobLimits.details}
        multiline
        autoCapitalize="sentences"
      />
      <Checkbox label={t('jobs.form.remote')} checked={remote} onChange={setRemote} />
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
          <Field label={t('dir.form.city')} value={city} onChange={setCity} max={jobLimits.city} />
        </View>
      </View>
      {remote && <Text style={styles.muted}>{t('jobs.form.remoteHint')}</Text>}
      <Field label={t('jobs.form.pay')} value={pay} onChange={setPay} max={jobLimits.pay} />
      <Field label={t('jobs.form.apply')} value={apply} onChange={setApply} max={jobLimits.apply} />
      {problem && <Text style={styles.problem}>{problem}</Text>}
      <View style={styles.actions}>
        <Button label={t('aid.form.post')} onPress={save} disabled={!ready || busy} />
        <Button label={t('dir.form.cancel')} onPress={onCancel} kind="quiet" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    marginTop: space.lg,
    minHeight: 46,
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.slate,
  },
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
  job: { padding: space.md, gap: 4 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(31,30,29,0.1)' },
  kind: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.clayText,
    textTransform: 'uppercase',
  },
  title: { fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.slate },
  sub: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  details: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.slate },
  apply: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.clayText },
  rowButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.sm,
  },
  count: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  muted: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
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
  row: { flexDirection: 'row', gap: space.sm },
  countryField: { width: 110 },
  flex: { flex: 1 },
});
