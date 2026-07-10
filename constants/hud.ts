// Field-kit tokens for the always-dark HUD screens (home + course).
// Sanctioned literal colors — the HUD has no light mode, so these bypass
// useTheme() the same way SCENE_COLORS does. Never use these on the inner
// section screens; those stay on theme tokens until their own design passes.
export const HUD_COLORS = {
  bg: '#071410', // page background
  panel: '#04241b', // raised panel fill
  panelDeep: '#04342C', // avatar frame / deepest fill
  line: '#0F6E56', // hairline borders
  lineBright: '#1D9E75', // emphasized borders (chat bar, avatar frame)
  mint: '#5DCAA5', // primary accent, active states, good news
  mintSoft: '#9FE1CB', // secondary text
  text: '#E1F5EE', // primary text
  amber: '#FAC775', // needs-attention / open items
} as const;

// Loaded in app/_layout.tsx via @expo-google-fonts/jetbrains-mono.
export const HUD_FONT = 'JetBrainsMono_400Regular';
export const HUD_FONT_BOLD = 'JetBrainsMono_700Bold';

export const HUD_RADIUS = 4; // tight corners — HUD panels are not bubbly

// Old-money accents for the Invest pages: engraved-serif numerals in cream
// with brass rules, layered inside the HUD frame. Baskerville ships with iOS;
// Android quietly falls back to the system serif.
import { Platform } from 'react-native';
export const MONEY_SERIF = Platform.select({ ios: 'Baskerville', default: 'serif' }) as string;
export const MONEY_COLORS = {
  cream: '#F1EFE8',
  brass: '#C9A961',
} as const;
