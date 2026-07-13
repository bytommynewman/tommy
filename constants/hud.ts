// Clubhouse tokens for the always-dark screens (home + course + sections).
// 2126 country-club modern: deep pine greens, fresh fairway accent, soft
// radii, geometric type — the spy-HUD era is retired. Sanctioned literal
// colors (no light mode), bypassing useTheme() like SCENE_COLORS does.
export const HUD_COLORS = {
  bg: '#0A1911', // page background — deep pine
  panel: '#102317', // raised panel fill
  panelDeep: '#16321F', // deepest fill / chips
  line: '#1E4230', // hairline borders
  lineBright: '#2C6B49', // emphasized borders
  mint: '#6FE3A0', // primary accent — fresh fairway
  mintSoft: '#AFCDBA', // secondary text
  text: '#F2F7F3', // primary text
  amber: '#F1C36B', // needs-attention / down-moves
} as const;

// Loaded in app/_layout.tsx via @expo-google-fonts/space-grotesk.
export const HUD_FONT = 'SpaceGrotesk_400Regular';
export const HUD_FONT_BOLD = 'SpaceGrotesk_700Bold';

export const HUD_RADIUS = 14; // soft modern corners

// Old-money accents for the Invest pages: engraved-serif numerals in cream
// with brass rules, layered inside the HUD frame. Baskerville ships with iOS;
// Android quietly falls back to the system serif.
import { Platform } from 'react-native';
export const MONEY_SERIF = Platform.select({ ios: 'Baskerville', default: 'serif' }) as string;
export const MONEY_COLORS = {
  cream: '#F1EFE8',
  brass: '#C9A961',
} as const;
