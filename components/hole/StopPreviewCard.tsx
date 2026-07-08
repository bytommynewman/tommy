import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HoleStop } from '../../constants/hole';
import { useTheme } from '../../lib/theme';

type StopPreviewCardProps = {
  stop: HoleStop;
  stat: string | null; // live stat line; null → show the tagline
  onEnter: () => void;
};

export function StopPreviewCard({ stop, stat, onEnter }: StopPreviewCardProps) {
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown}
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom: insets.bottom + spacing.lg,
      }}
    >
      <Pressable
        onPress={onEnter}
        accessibilityRole="button"
        accessibilityLabel={`Enter ${stop.label}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={stop.icon} size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.heading, { color: colors.text }]}>{stop.label}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
            {stat ?? stop.tagline}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
      </Pressable>
    </Animated.View>
  );
}
