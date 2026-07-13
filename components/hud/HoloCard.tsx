import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { GlowBox } from './GlowBox';
import { HUD_COLORS } from '../../constants/hud';

// Feature card — the sci-fi corner ticks retired with the spy era; this is
// now a plain glowing card kept as a named layer so call sites read clearly.
export function HoloCard({
  children,
  glow = false,
  style,
}: {
  children: React.ReactNode;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <GlowBox glow={glow} style={[{ padding: 16, marginBottom: 12 }, style]}>
      {children}
    </GlowBox>
  );
}
