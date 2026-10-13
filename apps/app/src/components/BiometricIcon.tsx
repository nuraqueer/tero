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
    strokeWidth: 1.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {kind === 'faceId' || kind === 'face' ? (
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
          <Path
            d="M5.2 5.8a9.6 9.6 0 0 1 13.6 0M3.4 10.3A8.8 8.8 0 0 1 12 3.5a8.8 8.8 0 0 1 8.8 8.8v2"
            {...line}
          />
          <Path
            d="M3.2 14c.1 2.2.5 4.2 1.4 6M6.5 17.8A18 18 0 0 1 6 12.3a6 6 0 0 1 12 0c0 3.7-.5 6.6-1.7 9"
            {...line}
          />
          <Path
            d="M8 21c1.1-2.6 1.3-5.4 1.1-8.7a2.9 2.9 0 0 1 5.8 0c0 3.3-.3 6.6-1.3 9.2M12 12.3c.2 2.5 0 5.2-.6 7.3"
            {...line}
          />
        </>
      )}
    </Svg>
  );
}
