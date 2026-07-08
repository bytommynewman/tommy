import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../lib/theme';

// Scratch — the caddie. Original character (retro streetwear-golf energy):
// dimpled golf-ball head, bucket hat, wraparound shades, towel on the
// shoulder, and a golf club in hand (non-negotiable per the design spec).
export function ScratchMascot({ size = 140 }: { size?: number }) {
  const { colors, scheme } = useTheme();
  const cream = scheme === 'dark' ? '#EFEAD8' : '#F7F3E6';
  const green = colors.primary;
  const gold = colors.accent;
  const ink = scheme === 'dark' ? '#10130F' : '#1B1D18';

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* club shaft — held diagonally across the body, grip low-left, head high-right */}
      <Line x1="38" y1="176" x2="150" y2="78" stroke={ink} strokeWidth="7" strokeLinecap="round" />
      {/* club head (driver) */}
      <Path d="M146 84 q18 -14 26 -2 q6 10 -8 16 q-12 5 -22 -4 z" fill={gold} stroke={ink} strokeWidth="4" />
      {/* grip */}
      <Line x1="38" y1="176" x2="62" y2="155" stroke={gold} strokeWidth="11" strokeLinecap="round" />

      {/* body */}
      <Path d="M62 196 q0 -52 38 -52 q38 0 38 52 z" fill={green} stroke={ink} strokeWidth="5" />
      {/* towel over the right shoulder */}
      <Path d="M124 152 l26 0 l-6 40 l-14 0 z" fill={cream} stroke={ink} strokeWidth="4" />
      <Line x1="126" y1="166" x2="146" y2="166" stroke={gold} strokeWidth="4" />
      {/* hands gripping the club */}
      <Circle cx="52" cy="164" r="9" fill={cream} stroke={ink} strokeWidth="4" />
      <Circle cx="66" cy="152" r="9" fill={cream} stroke={ink} strokeWidth="4" />

      {/* golf-ball head */}
      <Circle cx="100" cy="92" r="46" fill={cream} stroke={ink} strokeWidth="5" />
      {/* dimples */}
      <G fill={ink} opacity={0.14}>
        <Circle cx="72" cy="104" r="3.4" />
        <Circle cx="86" cy="116" r="3.4" />
        <Circle cx="104" cy="120" r="3.4" />
        <Circle cx="122" cy="112" r="3.4" />
        <Circle cx="132" cy="96" r="3.4" />
      </G>
      {/* wraparound shades */}
      <Path d="M58 82 q42 -14 84 0 l-3 14 q-16 8 -36 4 q-4 -6 -6 -6 q-2 0 -6 6 q-20 4 -30 -4 z" fill={ink} />
      {/* smirk */}
      <Path d="M84 126 q16 12 32 2" stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* bucket hat */}
      <Path d="M56 62 q6 -34 44 -34 q38 0 44 34 z" fill={green} stroke={ink} strokeWidth="5" />
      <Ellipse cx="100" cy="63" rx="56" ry="12" fill={green} stroke={ink} strokeWidth="5" />
      {/* hat badge */}
      <Circle cx="100" cy="44" r="7" fill={gold} stroke={ink} strokeWidth="3" />

      {/* ground shadow */}
      <Ellipse cx="100" cy="196" rx="52" ry="5" fill={ink} opacity={0.12} />
      <Rect x="0" y="0" width="0" height="0" fill="none" />
    </Svg>
  );
}
