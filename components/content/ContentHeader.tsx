import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS } from '../../constants/hud';

const TABS = [
  { key: 'ideas', label: 'ideas', route: '/content/ideas' as const, icon: 'bulb-outline' as const },
  { key: 'editor', label: 'editor', route: '/content/editor' as const, icon: 'cut-outline' as const },
  { key: 'stats', label: '@bytommynewman', route: '/content/stats' as const, icon: 'stats-chart-outline' as const },
] as const;

const TITLES = {
  ideas: 'The Range',
  editor: 'The Studio',
  stats: '@bytommynewman',
} as const;

const SUBTITLES = {
  ideas: 'reel concepts, tuned to your come-up',
  editor: 'the studio · director ai on set',
  stats: 'live stats on the account',
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
          <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 16, color: HUD_COLORS.text }} numberOfLines={1}>
            {TITLES[active]}
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 1 }}>
            {SUBTITLES[active]}
          </Text>
        </View>
        <Pressable
          onPress={() => router.replace('/content')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to the clubhouse"
          style={{
            width: 34,
            height: 34,
            borderRadius: HUD_RADIUS,
            borderWidth: 0.75,
            borderColor: HUD_COLORS.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="home-outline" size={16} color={HUD_COLORS.mintSoft} />
        </Pressable>
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
                numberOfLines={1}
                style={{
                  fontFamily: HUD_FONT,
                  fontSize: tab.label.length > 8 ? 9 : 12,
                  color: isActive ? HUD_COLORS.mint : HUD_COLORS.mintSoft,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
