import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../../lib/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'danger';
};

export function Chip({ label, selected = false, onPress, tone = 'default' }: ChipProps) {
  const { colors, spacing, radii, typography } = useTheme();
  const activeBg = tone === 'danger' ? colors.danger : colors.primaryMuted;
  const activeText = tone === 'danger' ? colors.background : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: selected ? (tone === 'danger' ? colors.danger : colors.primary) : colors.border,
        backgroundColor: selected ? activeBg : colors.surface,
      }}
    >
      <Text style={[typography.caption, { color: selected ? activeText : colors.text }]}>{label}</Text>
    </Pressable>
  );
}
