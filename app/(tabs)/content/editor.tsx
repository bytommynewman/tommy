import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContentHeader } from '../../../components/content/ContentHeader';
import { GlowBox } from '../../../components/hud/GlowBox';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS } from '../../../constants/hud';

// Slice 2 fills this with the AI edit director; the stub keeps the sub-tab
// navigation complete in the meantime.
export default function EditorScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <ContentHeader active="editor" />
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
            <Ionicons name="cut-outline" size={26} color={HUD_COLORS.mint} />
          </View>
          <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 14, color: HUD_COLORS.text }}>
            edit director · standby
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
            shipping next: pick a saved idea and scratch builds the whole edit —
            shot list, second-by-second cut sheet, caption, hashtags, music call.
          </Text>
        </GlowBox>
      </ScrollView>
    </View>
  );
}
