/**
 * Tero design tokens. See docs/design.md for the reasoning behind each value.
 */

export const colors = {
  ivory: '#FAF9F5',
  paper: '#FFFFFF',
  oat: '#E3DACC',
  oatLight: '#F0EEE6',
  slate: '#141413',
  slateSoft: '#1F1E1D',
  textSecondary: '#5E5D59',
  textMuted: '#73726C',
  clay: '#D97757',
  clayText: '#B4532F',
  clayDeep: '#8F3F22',
  gold: '#C9A27E',
  goldLight: '#E6C9A8',
  hairline: 'rgba(31,30,29,0.15)',
} as const;

export type ColorName = keyof typeof colors;

/** Font family keys, matching the names the app registers with expo-font. */
export const fonts = {
  display: 'Newsreader_400Regular',
  displayMedium: 'Newsreader_500Medium',
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodySemibold: 'InstrumentSans_600SemiBold',
  mark: 'JetBrainsMono_600SemiBold',
  card: 'Cinzel_500Medium',
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Minimum size for anything a person taps. */
export const touchTarget = 44;
