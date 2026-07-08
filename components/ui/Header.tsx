import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';

type HeaderProps = {
  title: string;
  subtitle?: string;
  kicker?: string;
  showSettings?: boolean;
};

export function Header({ title, subtitle, kicker, showSettings = true }: HeaderProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: spacing.md }}>
          {kicker ? (
            <Text style={[typography.label, { color: colors.textFaint, marginBottom: spacing.xs }]}>
              {kicker}
            </Text>
          ) : null}
          <Text style={[typography.display, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {showSettings ? (
          <Pressable
            onPress={() => router.push('/modal/settings')}
            hitSlop={8}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surfaceMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person-outline" size={19} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
