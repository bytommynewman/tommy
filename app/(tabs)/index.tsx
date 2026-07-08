import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToggleBar } from '../../components/ui/ToggleBar';
import { useTheme } from '../../lib/theme';

// Scratch home. Tasks 4-6 replace this skeleton with the mascot header,
// daily read, overview grid, and chat bar.
export default function ScratchScreen() {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }}>
      <Text style={[typography.title, { color: colors.text, paddingHorizontal: spacing.lg }]}>Scratch</Text>
      <ToggleBar active="scratch" />
    </View>
  );
}
