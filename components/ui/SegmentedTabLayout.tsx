import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Slot, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SegmentedControl } from './SegmentedControl';
import { useTheme } from '../../lib/theme';

type SegmentedTabLayoutProps = {
  title: string;
  basePath: string;
  segments: { key: string; label: string }[];
  activeKey: string;
};

export function SegmentedTabLayout({ title, basePath, segments, activeKey }: SegmentedTabLayoutProps) {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.md,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to the course"
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        </Pressable>
        <Text style={[typography.title, { color: colors.text }]}>{title}</Text>
      </View>
      <SegmentedControl
        value={activeKey}
        onChange={(key) => router.replace(`${basePath}/${key}` as never)}
        segments={segments}
      />
      <Slot />
    </View>
  );
}
