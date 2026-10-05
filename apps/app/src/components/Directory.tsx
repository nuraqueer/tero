import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { MessageKey } from '@tero/i18n';
import {
  placeCosts,
  placeLimits,
  type DirectoryPart,
  type NewPlace,
  type Place,
  type PlaceCost,
} from '@tero/protocol';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { ApiError } from '@/lib/api';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';

type Filter = 'vouched' | 'free' | 'international';

/** Places members trust, for one part of Help: search, filters, vouches, and adding one. */
export function Directory({ part }: { part: DirectoryPart }) {
  const { t } = useLocale();
  const session = useFullSession();
  const connected = session?.connection === 'connected';
  const api = session?.api;
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [adding, setAdding] = useState(false);
  const [problem, setProblem] = useState<string>();

  const load = useCallback(() => {
    const client = api?.();
    if (!client) return;
    client
      .listPlaces(part)
      .then((list) => {
        setPlaces(list);
        setProblem(undefined);
      })
      .catch(() => setProblem(t('dir.failed')));
  }, [api, part, t]);

  useFocusEffect(
    useCallback(() => {
      if (connected) load();
    }, [connected, load]),
  );

  const shown = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (places ?? []).filter((p) => {
      if (filters.includes('vouched') && p.vouches === 0 && !p.verified) return false;
      if (filters.includes('free') && p.cost !== 'free' && p.cost !== 'low') return false;
      if (filters.includes('international') && !p.international) return false;
      const text = `${p.name} ${p.city} ${p.country} ${p.offers}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [places, query, filters]);

  if (!session) {
    return <Text style={styles.note}>{t('dir.membersOnly')}</Text>;
  }

  const act = async (run: () => Promise<unknown>) => {
    try {
      await run();
      load();
    } catch {
      setProblem(t('dir.failed'));
    }
  };

  const toggle = (f: Filter) =>
    setFilters((all) => (all.includes(f) ? all.filter((x) => x !== f) : [...all, f]));

  return (
    <>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('dir.search')}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        style={styles.search}
        accessibilityLabel={t('dir.search')}
      />
      <View style={styles.toggles}>
        {(
          [
            ['vouched', 'dir.verified'],
            ['free', 'dir.free'],
            ['international', 'dir.international'],
          ] as const
        ).map(([f, key]) => {
          const on = filters.includes(f);
          return (
            <Pressable
              key={f}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(f)}
              style={[styles.toggle, on && styles.toggleOn]}
            >
              <Text style={[styles.toggleText, on && styles.toggleTextOn]}>
                {on ? '✓ ' : ''}
                {t(key)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!connected && <Text style={styles.note}>{t('dir.offline')}</Text>}
      {problem && <Text style={styles.problem}>{problem}</Text>}

      {places !== null && (
        <Text style={styles.count}>{t('dir.count', { count: shown.length })}</Text>
      )}
      {places !== null && shown.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {places.length === 0 ? t(`dir.empty.${part}` as MessageKey) : t('dir.noMatch')}
          </Text>
        </View>
      )}
      {shown.length > 0 && (
        <View style={styles.list}>
          {shown.map((place, i) => (
            <PlaceRow
              key={place.id}
              place={place}
              first={i === 0}
              canRemove={place.mine || session.role === 'fool' || session.role === 'council'}
              onVouch={() => act(() => session.api()!.vouchPlace(place.id, !place.vouched))}
              onRemove={() => act(() => session.api()!.removePlace(place.id))}
            />
          ))}
        </View>
      )}

      {adding ? (
        <PlaceForm
          part={part}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      ) : (
        <View style={styles.actions}>
          <Button
            label={t('dir.submit')}
            onPress={() => setAdding(true)}
            kind="secondary"
            disabled={!connected}
          />
        </View>
      )}
      <Text style={styles.note}>{t('dir.privacy')}</Text>
    </>
  );
}

function PlaceRow({
  place,
  first,
  canRemove,
  onVouch,
  onRemove,
}: {
  place: Place;
  first: boolean;
  canRemove: boolean;
  onVouch: () => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  const tags: string[] = [t(`dir.cost.${place.cost}` as MessageKey)];
  if (place.international) tags.push(t('dir.abroad'));
  return (
    <View style={[styles.place, !first && styles.divider]}>
      <View style={styles.placeHead}>
        <Text style={styles.placeName}>{place.name}</Text>
        {place.verified && <Text style={styles.partner}>{t('dir.partner')}</Text>}
      </View>
      <Text style={styles.where}>
        {place.city} · {place.country}
      </Text>
      {place.unaware && (
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>{t('dir.unaware')}</Text>
          <Text style={styles.warningText}>{t('dir.unawareNote')}</Text>
        </View>
      )}
      <Text style={styles.offers}>{place.offers}</Text>
      {place.contact.length > 0 && (
        <Text style={styles.contact} selectable>
          {place.contact}
        </Text>
      )}
      <Text style={styles.tags}>{tags.join(' · ')}</Text>
      <View style={styles.placeActions}>
        <Text style={styles.vouches}>
          {place.mine ? t('dir.yours') + ' · ' : ''}
          {t('dir.vouches', { count: place.vouches })}
        </Text>
        {!place.mine && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: place.vouched }}
            onPress={onVouch}
            style={({ pressed }) => [
              styles.smallButton,
              place.vouched && styles.smallButtonOn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.smallText, place.vouched && styles.smallTextOn]}>
              {place.vouched ? `✓ ${t('dir.vouched')}` : t('dir.vouch')}
            </Text>
          </Pressable>
        )}
        {canRemove && (
          <Pressable
            accessibilityRole="button"
            onPress={onRemove}
            style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
          >
            <Text style={styles.smallText}>{t('dir.remove')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  max,
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  multiline?: boolean;
  autoCapitalize?: 'characters' | 'sentences';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        maxLength={max}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.inputMulti]}
      />
    </View>
  );
}

function PlaceForm({
  part,
  onCancel,
  onSaved,
}: {
  part: DirectoryPart;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t } = useLocale();
  const session = useFullSession();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [offers, setOffers] = useState('');
  const [contact, setContact] = useState('');
  const [cost, setCost] = useState<PlaceCost>('unknown');
  const [international, setInternational] = useState(false);
  const [unaware, setUnaware] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  const code = country.trim().toUpperCase();
  const ready =
    name.trim() !== '' && /^[A-Z]{2}$/.test(code) && city.trim() !== '' && offers.trim() !== '';

  const save = async () => {
    const client = session?.api();
    if (!client || !ready) return;
    const place: NewPlace = {
      part,
      name: name.trim(),
      country: code,
      city: city.trim(),
      offers: offers.trim(),
      contact: contact.trim(),
      cost,
      international,
      unaware,
    };
    setBusy(true);
    setProblem(undefined);
    try {
      await client.addPlace(place);
      onSaved();
    } catch (e) {
      setProblem(
        e instanceof ApiError && e.code === 'rate_limited' ? t('dir.limit') : t('dir.failed'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle} accessibilityRole="header">
        {t('dir.submit')}
      </Text>
      <Field label={t('dir.form.name')} value={name} onChange={setName} max={placeLimits.name} />
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
          <Field
            label={t('dir.form.city')}
            value={city}
            onChange={setCity}
            max={placeLimits.city}
          />
        </View>
      </View>
      <Field
        label={t('dir.form.offers')}
        value={offers}
        onChange={setOffers}
        max={placeLimits.offers}
        multiline
        autoCapitalize="sentences"
      />
      <Field
        label={t('dir.form.contact')}
        value={contact}
        onChange={setContact}
        max={placeLimits.contact}
      />
      <Text style={styles.label}>{t('dir.form.cost')}</Text>
      <View style={styles.toggles}>
        {placeCosts.map((c) => (
          <Pressable
            key={c}
            accessibilityRole="radio"
            accessibilityState={{ selected: cost === c }}
            onPress={() => setCost(c)}
            style={[styles.toggle, cost === c && styles.toggleOn]}
          >
            <Text style={[styles.toggleText, cost === c && styles.toggleTextOn]}>
              {t(`dir.cost.${c}` as MessageKey)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Checkbox
        label={t('dir.international')}
        checked={international}
        onChange={setInternational}
      />
      <Checkbox label={t('dir.form.unaware')} checked={unaware} onChange={setUnaware} />
      {problem && <Text style={styles.problem}>{problem}</Text>}
      <View style={styles.actions}>
        <Button label={t('dir.form.save')} onPress={save} disabled={!ready || busy} />
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
  toggles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  toggle: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(31,30,29,0.15)',
  },
  toggleOn: { backgroundColor: colors.oatLight, borderColor: colors.clayText },
  toggleText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate },
  toggleTextOn: { color: colors.clayText },
  count: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: space.lg,
  },
  empty: {
    marginTop: space.sm,
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
    marginTop: space.sm,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  place: { padding: space.md, gap: 4 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(31,30,29,0.1)' },
  placeHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  placeName: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.slate },
  partner: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.clayText,
    textTransform: 'uppercase',
  },
  where: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  warning: {
    marginVertical: 4,
    padding: space.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.oatLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.clay,
  },
  warningTitle: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.slate },
  warningText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.slate },
  offers: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.slate },
  contact: { fontFamily: fonts.body, fontSize: 14, color: colors.clayText },
  tags: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  placeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.sm,
  },
  vouches: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(31,30,29,0.18)',
  },
  smallButtonOn: { backgroundColor: colors.slate, borderColor: colors.slate },
  smallText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate },
  smallTextOn: { color: colors.ivory },
  pressed: { opacity: 0.7 },
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
  field: { gap: 4 },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: space.sm,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: space.sm + 4,
    borderRadius: radii.sm,
    backgroundColor: colors.ivory,
    borderWidth: 1,
    borderColor: 'rgba(31,30,29,0.15)',
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.slate,
  },
  inputMulti: { minHeight: 96, paddingTop: space.sm, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: space.sm },
  countryField: { width: 110 },
  flex: { flex: 1 },
});
