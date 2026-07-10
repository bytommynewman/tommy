import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { GlowBox } from './GlowBox';
import { HUD_COLORS } from '../../constants/hud';

// Sci-fi corner ticks on top of a GlowBox — four static views, no animation
// (idle per-frame animations stutter Expo Go).
export function HoloCard({
  children,
  glow = false,
  style,
}: {
  children: React.ReactNode;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const tick = (pos: object) => (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: 10,
        height: 10,
        borderColor: glow ? HUD_COLORS.mint : HUD_COLORS.lineBright,
        ...pos,
      }}
    />
  );
  return (
    <GlowBox glow={glow} style={[{ padding: 14, marginBottom: 12 }, style]}>
      {tick({ top: 3, left: 3, borderTopWidth: 1.5, borderLeftWidth: 1.5 })}
      {tick({ top: 3, right: 3, borderTopWidth: 1.5, borderRightWidth: 1.5 })}
      {tick({ bottom: 3, left: 3, borderBottomWidth: 1.5, borderLeftWidth: 1.5 })}
      {tick({ bottom: 3, right: 3, borderBottomWidth: 1.5, borderRightWidth: 1.5 })}
      {children}
    </GlowBox>
  );
}
