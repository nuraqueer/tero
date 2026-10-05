import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { encodeQR } from '@paulmillr/qr';
import { colors } from '@tero/ui';

/** A QR code drawn as one SVG path, with the quiet zone scanners need around it. */
export function QrCode({ value, size, label }: { value: string; size: number; label: string }) {
  const { path, cells } = useMemo(() => {
    const matrix = encodeQR(value, 'raw', { ecc: 'medium', border: 2 });
    let d = '';
    matrix.forEach((row, y) =>
      row.forEach((on, x) => {
        if (on) d += `M${x} ${y}h1v1h-1z`;
      }),
    );
    return { path: d, cells: matrix.length };
  }, [value]);

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${cells} ${cells}`}
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Rect width={cells} height={cells} fill={colors.paper} />
      <Path d={path} fill={colors.slate} />
    </Svg>
  );
}
