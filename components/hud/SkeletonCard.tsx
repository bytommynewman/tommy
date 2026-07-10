import React from 'react';
import { View, type DimensionValue } from 'react-native';
import { GlowBox } from './GlowBox';
import { HUD_COLORS } from '../../constants/hud';

// Static placeholder card shown while a list makes its first fetch — no
// pulse animation on purpose (idle per-frame animations stutter Expo Go).
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <GlowBox style={{ padding: 12, marginBottom: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 10,
            borderRadius: 2,
            backgroundColor: HUD_COLORS.panelDeep,
            marginTop: i === 0 ? 0 : 10,
            width: `${92 - i * 22}%` as DimensionValue,
          }}
        />
      ))}
    </GlowBox>
  );
}
