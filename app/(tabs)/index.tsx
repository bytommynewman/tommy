import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ToggleBar, TOGGLE_BAR_CLEARANCE } from '../../components/ui/ToggleBar';
import { ScratchMascot } from '../../components/scratch/ScratchMascot';
import { DailyReadCard } from '../../components/scratch/DailyReadCard';
import { SectionOverviewGrid } from '../../components/scratch/SectionOverviewGrid';
import { ChatSheet } from '../../components/scratch/ChatSheet';
import { useTheme } from '../../lib/theme';
import { useProfile } from '../../lib/hooks/useProfile';

export default function ScratchScreen() {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const firstName = profile?.display_name?.split(' ')[0] ?? 'Tommy';
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + TOGGLE_BAR_CLEARANCE + spacing.xl + 56,
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
      <Pressable
        onPress={() => setChatOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Chat with Scratch"
        style={{
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          bottom: insets.bottom + TOGGLE_BAR_CLEARANCE + spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.md,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
        <Text style={[typography.body, { color: colors.textFaint, flex: 1 }]}>Ask Scratch anything…</Text>
      </Pressable>
      <ChatSheet visible={chatOpen} onClose={() => setChatOpen(false)} />
      <ToggleBar active="scratch" />
    </View>
  );
}
