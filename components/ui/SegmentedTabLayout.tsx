import React from 'react';
import { Text, View } from 'react-native';
import { Slot, router } from 'expo-router';
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
      <Text
        style={[
          typography.title,
          { color: colors.text, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
        ]}
      >
        {title}
      </Text>
      <SegmentedControl
        value={activeKey}
        onChange={(key) => router.replace(`${basePath}/${key}` as never)}
        segments={segments}
      />
      <Slot />
    </View>
  );
}
