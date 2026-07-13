import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Slot, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS } from '../../constants/hud';
import { STOPS } from '../../constants/hole';

type SegmentedTabLayoutProps = {
  title: string;
  basePath: string;
  segments: { key: string; label: string }[];
  activeKey: string;
};

// HUD field-kit section shell: back arrow to the course, hole number from
// STOPS, and the sub-tabs as HUD chips. Shared by every section, so all of
// them match the golf-spy look at once.
export function SegmentedTabLayout({ title, basePath, segments, activeKey }: SegmentedTabLayoutProps) {
  const insets = useSafeAreaInsets();
  const holeIndex = STOPS.findIndex((s) => s.route === basePath);

  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/course'))}
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
          <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 16, color: HUD_COLORS.text, flex: 1 }}>
            {title.toLowerCase()}
          </Text>
          {holeIndex >= 0 ? (
            <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line }}>
              {`hole ${holeIndex + 1}`}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          {segments.map((seg) => {
            const isActive = seg.key === activeKey;
            return (
              <Pressable
                key={seg.key}
                onPress={() => {
                  if (!isActive) router.replace(`${basePath}/${seg.key}` as never);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Open ${seg.label}`}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 9,
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
                  {seg.label.toLowerCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Slot />
    </View>
  );
}
