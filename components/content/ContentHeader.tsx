import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS } from '../../constants/hud';

const TABS = [
  { key: 'ideas', route: '/content/ideas' as const },
  { key: 'editor', route: '/content/editor' as const },
  { key: 'stats', route: '/content/stats' as const },
];

// Shared header for the three content sub-pages: section title plus the
// hop-chips so Tommy can move between ideas/editor/stats without going back
// out to the course.
export function ContentHeader({ active }: { active: 'ideas' | 'editor' | 'stats' }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 14, color: HUD_COLORS.text }}>
          {`content · ${active}`}
        </Text>
        <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft }}>hole 6</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                if (!isActive) router.replace(tab.route);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Open ${tab.key}`}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 8,
                borderWidth: 0.75,
                borderColor: isActive ? HUD_COLORS.lineBright : HUD_COLORS.line,
                borderRadius: HUD_RADIUS,
                backgroundColor: isActive ? HUD_COLORS.panelDeep : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: HUD_FONT,
                  fontSize: 12,
                  color: isActive ? HUD_COLORS.mint : HUD_COLORS.mintSoft,
                }}
              >
                {tab.key}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
