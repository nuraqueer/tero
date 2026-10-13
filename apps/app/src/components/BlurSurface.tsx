import type { ReactNode, RefObject } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '@tero/ui';

export type GlassSurfaceProps = ViewProps & {
  children?: ReactNode;
  blurTarget: RefObject<View | null>;
  reduceTransparency: boolean;
};

/** Efficient native blur where supported, with a readable accessibility fallback. */
export function BlurSurface({
  children,
  blurTarget,
  reduceTransparency,
  ...props
}: GlassSurfaceProps) {
  return (
    <View {...props}>
      {!reduceTransparency && (
        <BlurView
          blurTarget={blurTarget}
          blurMethod="dimezisBlurViewSdk31Plus"
          intensity={65}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: reduceTransparency ? colors.oatLight : 'rgba(240,238,230,0.38)' },
        ]}
      />
      {children}
    </View>
  );
}
