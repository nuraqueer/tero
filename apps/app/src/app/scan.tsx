import { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { tokenFromCardLink } from '@tero/protocol';
import { colors, fonts, radii, space, touchTarget } from '@tero/ui';
import { Button } from '@/components/Button';
import { Page } from '@/components/Page';
import { useLocale } from '@/lib/locale';

export default function Scan() {
  const { t } = useLocale();
  const [permission, requestPermission] = useCameraPermissions();
  const [link, setLink] = useState('');
  const [invalid, setInvalid] = useState(false);
  const opened = useRef(false);

  const open = (text: string) => {
    const token = tokenFromCardLink(text);
    if (!token) return false;
    if (!opened.current) {
      opened.current = true;
      router.replace({ pathname: '/c/[token]', params: { token } });
    }
    return true;
  };

  // On the web, the phone's own camera app opens the card link directly.
  const camera = Platform.OS !== 'web';

  return (
    <Page>
      <Text style={styles.title} accessibilityRole="header">
        {t('scan.title')}
      </Text>
      {camera && (
        <>
          <Text style={styles.body}>{t('scan.body')}</Text>
          <View style={styles.viewfinder}>
            {permission?.granted ? (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => open(data)}
              />
            ) : (
              <Button label={t('scan.allowCamera')} onPress={requestPermission} />
            )}
          </View>
        </>
      )}
      <Text style={styles.label} nativeID="card-link">
        {t('scan.paste')}
      </Text>
      <TextInput
        accessibilityLabelledBy="card-link"
        accessibilityLabel={t('scan.paste')}
        value={link}
        onChangeText={(text) => {
          setInvalid(false);
          setLink(text);
        }}
        placeholder="https://tero.pherus.org/c/…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      <Text style={styles.error} accessibilityLiveRegion="polite">
        {invalid ? t('scan.invalid') : ''}
      </Text>
      <View style={styles.actions}>
        <Button label={t('scan.open')} onPress={() => setInvalid(!open(link))} />
        <Button label={t('setup.back')} onPress={() => router.back()} kind="quiet" />
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
  viewfinder: {
    marginTop: space.lg,
    aspectRatio: 1,
    width: '100%',
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.oatLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.slate,
    marginTop: space.lg,
    marginBottom: space.xs,
  },
  input: {
    minHeight: touchTarget + 4,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.paper,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.slate,
  },
  error: {
    minHeight: 22,
    marginTop: space.sm,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.clayText,
  },
  actions: { gap: space.sm + 4, marginTop: space.md },
});
