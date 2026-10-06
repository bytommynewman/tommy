import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';

type StepperProps = {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
};

export function Stepper({ label, value, onChange, min = 0, max = 20, suffix }: StepperProps) {
  const { colors, spacing, radii, typography } = useTheme();
  const current = value ?? 0;
  const btn = (icon: 'remove' | 'add', onPress: () => void, disabled: boolean) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${icon === 'add' ? 'Increase' : 'Decrease'} ${label}`}
      style={{
        width: 36,
        height: 36,
        borderRadius: radii.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceMuted,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.text} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {btn('remove', () => onChange(Math.max(min, current - 1)), current <= min)}
        <Text style={[typography.body, { color: value === null ? colors.textFaint : colors.text, minWidth: 44, textAlign: 'center' }]}>
          {value === null ? '—' : `${value}${suffix ?? ''}`}
        </Text>
        {btn('add', () => onChange(Math.min(max, current + 1)), current >= max)}
      </View>
    </View>
  );
}
