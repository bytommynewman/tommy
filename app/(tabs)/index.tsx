import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToggleBar, TOGGLE_BAR_CLEARANCE } from '../../components/ui/ToggleBar';
import { ScratchMascot } from '../../components/scratch/ScratchMascot';
import { DailyReadCard } from '../../components/scratch/DailyReadCard';
import { SectionOverviewGrid } from '../../components/scratch/SectionOverviewGrid';
import { useTheme } from '../../lib/theme';
import { useProfile } from '../../lib/hooks/useProfile';

export default function ScratchScreen() {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const firstName = profile?.display_name?.split(' ')[0] ?? 'Tommy';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + TOGGLE_BAR_CLEARANCE + spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
          <ScratchMascot size={120} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: colors.accent, marginBottom: spacing.xs }]}>
              YOUR CADDIE — SCRATCH
            </Text>
            <Text style={[typography.title, { color: colors.text }]}>
              What&apos;s the play today, {firstName}?
            </Text>
          </View>
        </View>
        <DailyReadCard />
        <SectionOverviewGrid />
      </ScrollView>
      <ToggleBar active="scratch" />
    </View>
  );
}
