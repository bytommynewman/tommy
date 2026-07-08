import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../lib/theme';

type SegmentedControlProps<T extends string> = {
  segments: { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ segments, value, onChange }: SegmentedControlProps<T>) {
  const { colors, spacing, radii, typography, scheme } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.pill,
        padding: 4,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
      }}
    >
      {segments.map((segment) => {
        const isActive = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            onPress={() => onChange(segment.key)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm + 2,
              borderRadius: radii.pill,
              backgroundColor: isActive ? colors.surface : 'transparent',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOpacity: isActive && scheme === 'light' ? 0.08 : 0,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <Text
              style={[
                typography.caption,
                {
                  color: isActive ? colors.text : colors.textMuted,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
