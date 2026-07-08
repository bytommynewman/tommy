import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../../lib/theme';

type TextFieldProps = TextInputProps & {
  label?: string;
};

export function TextField({ label, style, ...rest }: TextFieldProps) {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            color: colors.text,
            fontSize: typography.body.fontSize,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}
