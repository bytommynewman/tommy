import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../../lib/theme';

type CardProps = ViewProps & {
  tone?: 'default' | 'primary' | 'accent';
};

export function Card({ style, tone = 'default', children, ...rest }: CardProps) {
  const { colors, spacing, radii, scheme } = useTheme();

  const backgroundColor =
    tone === 'primary' ? colors.primaryMuted : tone === 'accent' ? colors.accentMuted : colors.surface;

  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: radii.lg,
          borderWidth: tone === 'default' ? 1 : 0,
          borderColor: colors.border,
          padding: spacing.md,
          shadowColor: '#000',
          shadowOpacity: scheme === 'dark' ? 0 : 0.04,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
