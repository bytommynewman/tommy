import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
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
  const shaft = scheme === 'dark' ? '#8B8E85' : ink;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* body */}
      <Path d="M52 196 q0 -52 38 -52 q38 0 38 52 z" fill={green} stroke={ink} strokeWidth="5" />
      {/* towel over the left shoulder */}
      <Path d="M54 152 l26 0 l-6 40 l-14 0 z" fill={cream} stroke={ink} strokeWidth="4" />
      <Line x1="58" y1="166" x2="76" y2="166" stroke={gold} strokeWidth="4" />
      {/* club — leaning on it: grip up top, driver head resting on the ground */}
      <Line x1="160" y1="70" x2="160" y2="184" stroke={shaft} strokeWidth="7" strokeLinecap="round" />
      <Line x1="160" y1="58" x2="160" y2="84" stroke={gold} strokeWidth="11" strokeLinecap="round" />
      <Path d="M160 182 q2 12 -16 12 q-14 0 -12 -10 q2 -8 14 -8 q10 0 14 6 z" fill={gold} stroke={shaft} strokeWidth="4" />
      {/* arm + hands gripping the club */}
      <Line x1="122" y1="160" x2="154" y2="112" stroke={green} strokeWidth="14" strokeLinecap="round" />
      <Circle cx="158" cy="104" r="9" fill={cream} stroke={ink} strokeWidth="4" />
      <Circle cx="158" cy="122" r="9" fill={cream} stroke={ink} strokeWidth="4" />
      {/* golf-ball head */}
      <Circle cx="96" cy="92" r="46" fill={cream} stroke={ink} strokeWidth="5" />
      {/* dimples */}
      <G fill={ink} opacity={0.14}>
        <Circle cx="68" cy="104" r="3.4" />
        <Circle cx="82" cy="116" r="3.4" />
        <Circle cx="100" cy="120" r="3.4" />
        <Circle cx="118" cy="112" r="3.4" />
        <Circle cx="128" cy="96" r="3.4" />
      </G>
      {/* wraparound shades */}
      <Path d="M54 82 q42 -14 84 0 l-3 14 q-16 8 -36 4 q-4 -6 -6 -6 q-2 0 -6 6 q-20 4 -30 -4 z" fill={ink} />
      {/* smirk */}
      <Path d="M80 126 q16 12 32 2" stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* bucket hat */}
      <Path d="M52 62 q6 -34 44 -34 q38 0 44 34 z" fill={green} stroke={ink} strokeWidth="5" />
      <Ellipse cx="96" cy="63" rx="56" ry="12" fill={green} stroke={ink} strokeWidth="5" />
      <Circle cx="96" cy="44" r="7" fill={gold} stroke={ink} strokeWidth="3" />
      {/* ground shadow */}
      <Ellipse cx="104" cy="196" rx="56" ry="5" fill={ink} opacity={0.12} />
    </Svg>
  );
}
