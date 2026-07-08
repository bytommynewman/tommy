export const palette = {
  light: {
    background: '#F6F5F1',
    surface: '#FFFFFF',
    surfaceMuted: '#ECEAE3',
    surfaceRaised: '#FDFCFA',
    border: '#E2DFD7',
    text: '#191A17',
    textMuted: '#6E6D65',
    textFaint: '#9B9A91',
    primary: '#2E4B41',
    primaryMuted: '#DEE9E4',
    onPrimary: '#F4F7F5',
    accent: '#B4823F',
    accentMuted: '#F0E4D2',
    success: '#3E7355',
    warning: '#B4823F',
    danger: '#A34F3B',
    calm: '#5F7482',
  },
  dark: {
    background: '#0E1013',
    surface: '#16191E',
    surfaceMuted: '#1E2229',
    surfaceRaised: '#1B1F25',
    border: '#2A2F38',
    text: '#EFEFEC',
    textMuted: '#A3A49C',
    textFaint: '#71726B',
    primary: '#8FBCA8',
    primaryMuted: '#22332C',
    onPrimary: '#0E1013',
    accent: '#D9A662',
    accentMuted: '#33291A',
    success: '#83B497',
    warning: '#D9A662',
    danger: '#CE8570',
    calm: '#8FA5B4',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 22,
  pill: 999,
};

export const typography = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  stat: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -1 },
};

export type ThemeColors = Record<keyof typeof palette.light, string>;
