import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from './Screen';
import { Card } from './Card';
import { useTheme } from '../../lib/theme';

type PlaceholderScreenProps = {
  title: string;
  note: string;
  icon?: keyof typeof Ionicons.glyphMap;
  safeTop?: boolean;
};

export function PlaceholderScreen({ title, note, icon = 'construct-outline', safeTop = false }: PlaceholderScreenProps) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Screen safeTop={safeTop}>
      <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Ionicons name={icon} size={24} color={colors.textMuted} />
        </View>
        <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.sm, textAlign: 'center' }]}>
          {title}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>{note}</Text>
      </Card>
    </Screen>
  );
}
