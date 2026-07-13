import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToggleBar, TOGGLE_BAR_CLEARANCE } from '../../components/ui/ToggleBar';
import { BriefingCard } from '../../components/hud/BriefingCard';
import { StatChips } from '../../components/hud/StatChips';
import { ScorecardList } from '../../components/hud/ScorecardList';
import { ChatSheet } from '../../components/scratch/ChatSheet';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS } from '../../constants/hud';

export default function ScratchScreen() {
  const insets = useSafeAreaInsets();
  const [chatOpen, setChatOpen] = useState(false);
  const now = new Date();

  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + TOGGLE_BAR_CLEARANCE + 24 + 56,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontFamily: HUD_FONT, fontSize: 13, color: HUD_COLORS.mintSoft }}>
          {format(now, 'EEEE, MMMM d')}
        </Text>
        <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 28, color: HUD_COLORS.text, marginTop: 2, marginBottom: 14 }}>
          {now.getHours() < 12 ? 'Morning, Tommy' : now.getHours() < 17 ? 'Afternoon, Tommy' : 'Evening, Tommy'}
        </Text>
        <BriefingCard />
        <StatChips />
        <ScorecardList />
      </ScrollView>
      <Pressable
        onPress={() => setChatOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Chat with Scratch"
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: insets.bottom + TOGGLE_BAR_CLEARANCE + 12,
          backgroundColor: HUD_COLORS.panel,
          borderRadius: HUD_RADIUS,
          borderWidth: 0.75,
          borderColor: HUD_COLORS.lineBright,
          paddingVertical: 12,
          paddingHorizontal: 12,
        }}
      >
        <Text style={{ fontFamily: HUD_FONT, fontSize: 13, color: HUD_COLORS.mintSoft }}>
          Ask Scratch anything…
        </Text>
      </Pressable>
      <ChatSheet visible={chatOpen} onClose={() => setChatOpen(false)} />
      <ToggleBar active="scratch" />
    </View>
  );
}
