import { SymbolView } from 'expo-symbols';
import { colors } from '@tero/ui';
import type { BiometricKind } from '@/lib/biometric';

/** Use Apple's system symbol for the authentication method the device reports. */
export function BiometricIcon({
  kind,
  size = 28,
  color = colors.slate,
}: {
  kind: BiometricKind;
  size?: number;
  color?: string;
}) {
  return (
    <SymbolView
      name={kind === 'faceId' || kind === 'face' ? 'faceid' : 'touchid'}
      tintColor={color}
      size={size}
      weight="regular"
      style={{ width: size, height: size }}
      accessibilityElementsHidden
    />
  );
}
