import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../lib/theme';

export function SectionLabel({ children, right }: { children: string; right?: React.ReactNode }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
      }}
    >
      <Text style={[typography.label, { color: colors.textFaint }]}>{children}</Text>
      {right ?? null}
    </View>
  );
}
