import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurSurface, type GlassSurfaceProps } from './BlurSurface';

/** Use Apple's actual Liquid Glass material, rather than approximating it with blur. */
export function GlassSurface({
  children,
  blurTarget,
  reduceTransparency,
  ...props
}: GlassSurfaceProps) {
  if (!reduceTransparency && isGlassEffectAPIAvailable() && isLiquidGlassAvailable()) {
    return (
      <GlassView {...props} glassEffectStyle="regular" isInteractive>
        {children}
      </GlassView>
    );
  }
  return (
    <BlurSurface {...props} blurTarget={blurTarget} reduceTransparency={reduceTransparency}>
      {children}
    </BlurSurface>
  );
}
