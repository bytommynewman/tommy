import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContentHeader } from '../../../components/content/ContentHeader';
import { GlowBox } from '../../../components/hud/GlowBox';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS } from '../../../constants/hud';

// Slice 3 fills this with live Instagram numbers via the official API; the
// stub keeps the sub-tab navigation complete in the meantime.
export default function StatsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <ContentHeader active="stats" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <GlowBox glow style={{ padding: 20, alignItems: 'center' }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: HUD_RADIUS,
              borderWidth: 0.75,
              borderColor: HUD_COLORS.lineBright,
              backgroundColor: HUD_COLORS.panelDeep,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Ionicons name="stats-chart-outline" size={26} color={HUD_COLORS.mint} />
          </View>
          <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 14, color: HUD_COLORS.text }}>
            account intel · standby
          </Text>
          <Text
            style={{
              fontFamily: HUD_FONT,
              fontSize: 11,
              lineHeight: 19,
              color: HUD_COLORS.mintSoft,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            shipping soon: live follower count and trend, plus views, likes and
            comments per reel — synced straight from instagram. the one-time
            connection guide comes with it.
          </Text>
        </GlowBox>
      </ScrollView>
    </View>
  );
}
