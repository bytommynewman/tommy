import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Vec } from '../lib/holePath';

// The aerial photo's pixel dimensions — MUST match assets/hole16.webp
// (printed by scripts/stitch-hole16.mjs). All scene math is in image px.
export const SCENE = { width: 2400, height: 5660 };

export const HOLE_IMAGE = require('../assets/hole16.webp');

// Fairway centerline traced over the photo, tee (bottom) → green (top),
// normalized 0–1. Seeded from OSM-verified tee/green/dogleg positions
// measured in the final image. Tune with SHOW_PATH_DEBUG=true until
// the red line hugs the fairway in the actual photo.
// y values remapped for the 2026-07-09 extended crop (crop.top 4158 -> 3000,
// out 2400x4591 -> 2400x5660): new_y = (old_y * 4591 + 1069) / 5660, where
// 1069 output px of clubhouse grounds were added above the green. x unchanged.
const NORM_WAYPOINTS: Vec[] = [
  { x: 0.353, y: 0.8532 }, // tee boxes (OSM-verified centroid)
  { x: 0.467, y: 0.8175 },
  { x: 0.583, y: 0.7469 },
  { x: 0.617, y: 0.6837 }, // dogleg elbow, right of the tree stand (fairway landing area)
  { x: 0.583, y: 0.5953 },
  { x: 0.467, y: 0.489 },
  { x: 0.375, y: 0.3835 },
  { x: 0.333, y: 0.3016 },
  { x: 0.347, y: 0.2708 }, // green (OSM-verified centroid)
];

export const WAYPOINTS: Vec[] = NORM_WAYPOINTS.map((p) => ({
  x: p.x * SCENE.width,
  y: p.y * SCENE.height,
}));

export type HoleStop = {
  frac: number; // position along the path as a fraction of total length
  route: Href;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tagline: string;
};

export const STOPS: HoleStop[] = [
  { frac: 0.0, route: '/recovery', label: 'Recovery', icon: 'shield-checkmark-outline', tagline: 'Habits, streaks, staying on track' },
  { frac: 0.27, route: '/reflect', label: 'Reflect', icon: 'book-outline', tagline: 'Journal and therapist chat' },
  { frac: 0.52, route: '/plan', label: 'Plan', icon: 'calendar-outline', tagline: 'Calendar, goals, and content' },
  { frac: 0.78, route: '/life', label: 'Life', icon: 'body-outline', tagline: 'Fitness and people' },
  { frac: 1.0, route: '/invest', label: 'Invest', icon: 'trending-up-outline', tagline: 'Portfolio, watchlist, markets' },
];

export const STOP_NEAR_THRESHOLD = 90; // scene px along the path
export const CAMERA_ZOOM = 2.0; // scene fills 200% of screen width — the camera travels down the hole (tune on device)

// Walking view (travel mode): the photo plane pitches away like a PGA-game
// fairway camera. Tilt flattens to 0 as the pinch approaches overview fit.
// Tommy's rule: real imagery on every pixel, no sky/background — so the tilt
// stays gentle enough that the horizon never enters the screen, and
// useSatelliteNav clamps the camera (via visibleAboveFlat) so the view can
// never look past the photo's top edge. Raising WALK_TILT past ~0.6 will
// reintroduce a sky band; don't, without asking Tommy.
export const WALK_TILT = 0.52; // radians (~30°) at full travel zoom
export const WALK_PERSPECTIVE = 900; // screen px; smaller = stronger depth
export const WALK_PIVOT_Y = 0.72; // camera standpoint as a fraction of screen height

// Scene rendering colors (the sanctioned exception to theme tokens — these
// sit over a photo, not over themed UI). Satellite tint matches HUD_COLORS.bg.
export const SCENE_COLORS = {
  fallback: '#3E7355', // fairway green shown if the photo fails to load/decode
  satelliteTint: 'rgba(7, 20, 16, 0.30)', // always-on dark feed tint (kept light so the turf reads real)
  pathLine: '#5DCAA5', // dashed fairway line (HUD mint)
};

export const HINT_DISMISSED_KEY = 'hole.hintDismissed';

// Dev aid: draws the centerline + waypoints in red over the photo.
export const SHOW_PATH_DEBUG = false;
