import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';

export function HintOverlay({ visible }: { visible: boolean }) {
  const { colors, spacing, radii, typography } = useTheme();
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
          gap: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
        }}
      >
        <Ionicons name="chevron-up-outline" size={16} color={colors.primary} />
        <Text style={[typography.caption, { color: colors.text }]}>
          Swipe up to play the hole — pinch out to see it all
        </Text>
      </View>
    </Animated.View>
  );
}
