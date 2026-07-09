import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ContentHeader } from '../../../components/content/ContentHeader';
import { GlowBox } from '../../../components/hud/GlowBox';
import { HUD_COLORS, HUD_FONT } from '../../../constants/hud';

// Slice 2 fills this with the AI edit director; the stub keeps the sub-tab
// navigation complete in the meantime.
export default function EditorScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <ContentHeader active="editor" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <GlowBox style={{ padding: 14 }}>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.mintSoft, lineHeight: 20 }}>
            standby — the edit director reports here next. save an idea in the
            ideas tab and scratch will turn it into a full shot list and cut
            sheet.
          </Text>
        </GlowBox>
      </ScrollView>
    </View>
  );
}
