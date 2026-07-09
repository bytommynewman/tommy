import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { HUD_COLORS, HUD_FONT, HUD_RADIUS } from '../../constants/hud';

export function HintOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.delay(600)}
      exiting={FadeOut}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '58%',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'rgba(4, 36, 27, 0.85)',
          borderRadius: HUD_RADIUS,
          borderWidth: 0.75,
          borderColor: HUD_COLORS.line,
          paddingVertical: 8,
          paddingHorizontal: 12,
        }}
      >
        <Ionicons name="chevron-up-outline" size={16} color={HUD_COLORS.mint} />
        <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mintSoft }}>
          drag ↑↓ · tap a target · pinch for overview
        </Text>
      </View>
    </Animated.View>
  );
}
