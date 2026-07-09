import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS } from '../../constants/hud';

const OPTIONS = [
  { key: 'ideas', icon: 'bulb-outline' as const },
  { key: 'editor', icon: 'cut-outline' as const },
  { key: 'stats', icon: 'stats-chart-outline' as const },
];

// Content's fan-out on the course: tapping hole 6 opens this instead of
// navigating; each row goes straight into that sub-page.
export function SubPanel({ onSelect }: { onSelect: (key: 'ideas' | 'editor' | 'stats') => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(120)}
      style={{
        position: 'absolute',
        right: 16,
        bottom: insets.bottom + 170,
        backgroundColor: 'rgba(4, 36, 27, 0.92)',
        borderWidth: 0.75,
        borderColor: HUD_COLORS.lineBright,
        borderRadius: HUD_RADIUS,
        overflow: 'hidden',
        minWidth: 150,
      }}
    >
      <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 0.75, borderBottomColor: HUD_COLORS.line }}>
        <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 10, color: HUD_COLORS.text }}>6 · content</Text>
      </View>
      {OPTIONS.map((opt, i) => (
        <Pressable
          key={opt.key}
          onPress={() => onSelect(opt.key as 'ideas' | 'editor' | 'stats')}
          accessibilityRole="button"
          accessibilityLabel={`Open content ${opt.key}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 10,
            paddingVertical: 9,
            borderBottomWidth: i < OPTIONS.length - 1 ? 0.75 : 0,
            borderBottomColor: HUD_COLORS.line,
          }}
        >
          <Ionicons name={opt.icon} size={14} color={HUD_COLORS.mint} />
          <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.text }}>{opt.key}</Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}
