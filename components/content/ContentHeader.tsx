import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS } from '../../constants/hud';

const TABS = [
  { key: 'ideas', route: '/content/ideas' as const, icon: 'bulb-outline' as const },
  { key: 'editor', route: '/content/editor' as const, icon: 'cut-outline' as const },
  { key: 'stats', route: '/content/stats' as const, icon: 'stats-chart-outline' as const },
];

const SUBTITLES = {
  ideas: 'reel concepts, tuned to your come-up',
  editor: 'from idea to cut sheet',
  stats: 'the numbers behind the account',
} as const;

function backToCourse() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/course');
  }
}

// Shared header for the three content sub-pages: back arrow to the golf hole,
// section title, and hop-chips between ideas/editor/stats.
export function ContentHeader({ active }: { active: 'ideas' | 'editor' | 'stats' }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 0.75,
        borderBottomColor: HUD_COLORS.line,
        backgroundColor: HUD_COLORS.panel,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          onPress={backToCourse}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to the course"
          style={{
            width: 34,
            height: 34,
            borderRadius: HUD_RADIUS,
            borderWidth: 0.75,
            borderColor: HUD_COLORS.lineBright,
            backgroundColor: HUD_COLORS.panelDeep,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="arrow-back" size={18} color={HUD_COLORS.mint} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 16, color: HUD_COLORS.text }}>
            {`content · ${active}`}
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 1 }}>
            {SUBTITLES[active]}
          </Text>
        </View>
        <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line }}>hole 6</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
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
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 9,
                borderWidth: 0.75,
                borderColor: isActive ? HUD_COLORS.lineBright : HUD_COLORS.line,
                borderRadius: HUD_RADIUS,
                backgroundColor: isActive ? HUD_COLORS.panelDeep : 'transparent',
              }}
            >
              <Ionicons name={tab.icon} size={13} color={isActive ? HUD_COLORS.mint : HUD_COLORS.mintSoft} />
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
