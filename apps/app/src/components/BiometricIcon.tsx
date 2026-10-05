import Svg, { Path } from 'react-native-svg';
import { colors } from '@tero/ui';
import type { BiometricKind } from '@/lib/biometric';

/** A plain line drawing: a face in a frame for Face ID, a fingerprint otherwise. */
export function BiometricIcon({
  kind,
  size = 28,
  color = colors.slate,
}: {
  kind: BiometricKind;
  size?: number;
  color?: string;
}) {
  const line = {
    fill: 'none',
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {kind === 'face' ? (
        <>
          <Path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8" {...line} />
          <Path
            d="M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16"
            {...line}
          />
          <Path d="M8.5 9v1.5M15.5 9v1.5M12 9v4h-1M9 16c1.7 1.3 4.3 1.3 6 0" {...line} />
        </>
      ) : (
        <>
          <Path d="M6.5 7.5A7 7 0 0 1 19 12v1.5M5 11.5V12c0 3 .8 5.5 2.2 7.5" {...line} />
          <Path
            d="M8.5 12a3.5 3.5 0 0 1 7 0c0 3.5-.6 6-1.8 8.5M12 12c0 3.2-.5 6-1.8 8.5"
            {...line}
          />
          <Path d="M9 4.2A9 9 0 0 1 20.6 8" {...line} />
        </>
      )}
    </Svg>
  );
}
