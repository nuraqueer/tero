import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { isDisplayName, normalizeHandle } from '@tero/crypto';
import { colors, fonts, radii, space } from '@tero/ui';
import { Button } from './Button';
import { useDiscovery } from '@/lib/discovery';
import { useLocale } from '@/lib/locale';
import { ApiError } from '@/lib/api';

export function ProfileEditor() {
  const discovery = useDiscovery();
  const { refresh, checkHandle } = discovery;
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const normalizedHandle = normalizeHandle(handle);
  const validHandle = normalizedHandle !== null;
  const [availability, setAvailability] = useState<{
    handle: string;
    state: 'checking' | 'available' | 'taken' | 'failed';
  } | null>(null);
  const handleStatus = availability?.handle === normalizedHandle ? availability.state : 'checking';
  useEffect(() => {
    if (!editing || discovery.self || !normalizedHandle || !discovery.ready) return;
    let active = true;
    const timer = setTimeout(() => {
      setAvailability({ handle: normalizedHandle, state: 'checking' });
      void checkHandle(normalizedHandle)
        .then((available) => {
          if (active)
            setAvailability({ handle: normalizedHandle, state: available ? 'available' : 'taken' });
        })
        .catch(() => {
          if (active) setAvailability({ handle: normalizedHandle, state: 'failed' });
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [normalizedHandle, editing, discovery.self, discovery.ready, checkHandle]);
  const handleError = handle.length > 0 && !validHandle;
  const begin = () => {
    setHandle(discovery.self?.handle ?? '');
    setDisplayName(discovery.self?.displayName ?? '');
    setMessage(null);
    setEditing(true);
  };
  const save = async () => {
    const normalized = normalizeHandle(handle);
    const name = displayName.trim();
    if (!normalized || !isDisplayName(name)) {
      setMessage(t('profile.invalid'));
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await discovery.save({ handle: normalized, displayName: name });
      setEditing(false);
    } catch (cause) {
      setMessage(
        cause instanceof ApiError && cause.code === 'conflict'
          ? t('profile.conflict')
          : t('discovery.error'),
      );
    } finally {
      setBusy(false);
    }
  };
  const confirm = () => {
    if (discovery.self) {
      void save();
      return;
    }
    const normalized = normalizeHandle(handle);
    if (!normalized || !isDisplayName(displayName.trim())) {
      setMessage(t('profile.invalid'));
      return;
    }
    Alert.alert(t('profile.confirmTitle'), t('profile.confirmBody', { handle: normalized }), [
      { text: t('profile.cancel'), style: 'cancel' },
      {
        text: t('profile.claim'),
        onPress: () => {
          void save();
        },
      },
    ]);
  };
  return (
    <View style={styles.card}>
      <Text style={styles.heading} accessibilityRole="header">
        {t('profile.title')}
      </Text>
      {discovery.error && (
        <Text accessibilityRole="alert" style={styles.note}>
          {t('discovery.error')}
        </Text>
      )}
      {!discovery.ready ? (
        <>
          <Text style={styles.note}>
            {t(discovery.loading ? 'discovery.loading' : 'discovery.waiting')}
          </Text>
          <Button
            kind="quiet"
            label={t('discovery.refresh')}
            onPress={() => {
              void discovery.refresh();
            }}
            disabled={discovery.loading}
          />
        </>
      ) : discovery.selfEnvelope && !discovery.self ? (
        <Text accessibilityRole="alert" style={styles.note}>
          {t('discovery.invalid')}
        </Text>
      ) : editing ? (
        <>
          <Text style={styles.label}>{t('profile.handle')}</Text>
          <TextInput
            accessibilityLabel={t('profile.handle')}
            value={handle}
            onChangeText={(value) => {
              setHandle(value);
              setAvailability(null);
              setMessage(null);
            }}
            editable={!discovery.self && !busy}
            maxLength={25}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="@la-niina"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, discovery.self && styles.fixed, handleError && styles.invalid]}
          />
          <Text style={styles.note}>{t('profile.permanent')}</Text>
          {handleError && (
            <Text accessibilityLiveRegion="polite" style={styles.validation}>
              {t('profile.handleInvalid')}
            </Text>
          )}
          {!discovery.self && validHandle && (
            <Text
              accessibilityLiveRegion="polite"
              style={
                handleStatus === 'taken' || handleStatus === 'failed'
                  ? styles.validation
                  : styles.note
              }
            >
              {t(
                handleStatus === 'checking'
                  ? 'profile.checking'
                  : handleStatus === 'available'
                    ? 'profile.available'
                    : handleStatus === 'taken'
                      ? 'profile.taken'
                      : 'profile.checkFailed',
              )}
            </Text>
          )}
          <Text style={styles.label}>{t('profile.displayName')}</Text>
          <TextInput
            accessibilityLabel={t('profile.displayName')}
            placeholder="La niina"
            placeholderTextColor={colors.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
            editable={!busy}
            maxLength={64}
            autoCapitalize="words"
            style={styles.input}
          />
          {message && (
            <Text accessibilityRole="alert" style={styles.note}>
              {message}
            </Text>
          )}
          <View style={styles.actions}>
            <Button
              kind="quiet"
              label={t('profile.cancel')}
              disabled={busy}
              onPress={() => setEditing(false)}
            />
            <Button
              label={t(busy ? 'profile.saving' : 'profile.save')}
              disabled={
                busy ||
                discovery.loading ||
                !validHandle ||
                (!discovery.self && handleStatus !== 'available') ||
                !isDisplayName(displayName.trim())
              }
              onPress={confirm}
            />
          </View>
        </>
      ) : (
        <>
          {discovery.self ? (
            <>
              <Text style={styles.name}>{discovery.self.displayName}</Text>
              <Text style={styles.handle}>@{discovery.self.handle}</Text>
            </>
          ) : (
            <Text style={styles.note}>{t('profile.intro')}</Text>
          )}
          <Button
            kind="secondary"
            label={t(discovery.self ? 'profile.edit' : 'profile.setup')}
            onPress={begin}
          />
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    marginTop: 12,
  },
  heading: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.slate },
  name: { fontFamily: fonts.display, fontSize: 26, color: colors.slate },
  handle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.clayText },
  note: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  label: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.slate },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.slate,
  },
  invalid: { borderColor: colors.clayDeep },
  validation: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.clayDeep },
  fixed: { backgroundColor: colors.oatLight },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm, flexWrap: 'wrap' },
});
