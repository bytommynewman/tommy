import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ContentHeader } from '../../../components/content/ContentHeader';
import { GlowBox } from '../../../components/hud/GlowBox';
import { HUD_COLORS, HUD_FONT } from '../../../constants/hud';

// Slice 3 fills this with live Instagram numbers via the official API; the
// stub keeps the sub-tab navigation complete in the meantime.
export default function StatsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <ContentHeader active="stats" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <GlowBox style={{ padding: 14 }}>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.mintSoft, lineHeight: 20 }}>
            standby — instagram tracking arrives here. the connection setup
            guide (CONNECT-INSTAGRAM.md) ships with that slice.
          </Text>
        </GlowBox>
      </ScrollView>
    </View>
  );
}
