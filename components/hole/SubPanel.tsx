import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS } from '../../constants/hud';

const OPTIONS = [
  { key: 'ideas', icon: 'bulb-outline' as const, blurb: 'scratch pitches reels built on your life' },
  { key: 'editor', icon: 'cut-outline' as const, blurb: 'shot lists, cut sheets, captions' },
  { key: 'stats', icon: 'stats-chart-outline' as const, blurb: 'followers, views, what worked' },
];

// Content's fan-out on the course: a big centered command panel over a dimmed
// course. Tapping outside closes it; each option goes straight to its page.
export function SubPanel({
  onSelect,
  onClose,
}: {
  onSelect: (key: 'ideas' | 'editor' | 'stats') => void;
  onClose: () => void;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(140)}
      exiting={FadeOut.duration(120)}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Pressable
        onPress={onClose}
        accessibilityLabel="Close content panel"
        style={{ flex: 1, backgroundColor: 'rgba(2, 8, 6, 0.7)', alignItems: 'center', justifyContent: 'center' }}
      >
        <View>
          {/* Stop presses inside the card from bubbling to the scrim. */}
          <Pressable onPress={() => {}} style={{ width: 300 }}>
            <View
              style={{
                backgroundColor: HUD_COLORS.panel,
                borderWidth: 0.75,
                borderColor: HUD_COLORS.lineBright,
                borderRadius: HUD_RADIUS + 4,
                overflow: 'hidden',
                shadowColor: HUD_COLORS.mint,
                shadowOpacity: 0.35,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 0.75,
                  borderBottomColor: HUD_COLORS.line,
                  backgroundColor: HUD_COLORS.panelDeep,
                }}
              >
                <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 15, color: HUD_COLORS.text }}>
                  6 · content
                </Text>
                <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft }}>
                  pick your play
                </Text>
              </View>
              {OPTIONS.map((opt, i) => (
                <Pressable
                  key={opt.key}
                  onPress={() => onSelect(opt.key as 'ideas' | 'editor' | 'stats')}
                  accessibilityRole="button"
                  accessibilityLabel={`Open content ${opt.key}`}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    borderBottomWidth: i < OPTIONS.length - 1 ? 0.75 : 0,
                    borderBottomColor: HUD_COLORS.line,
                    backgroundColor: pressed ? HUD_COLORS.panelDeep : 'transparent',
                  })}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: HUD_RADIUS,
                      borderWidth: 0.75,
                      borderColor: HUD_COLORS.lineBright,
                      backgroundColor: HUD_COLORS.panelDeep,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={opt.icon} size={20} color={HUD_COLORS.mint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 15, color: HUD_COLORS.text }}>
                      {opt.key}
                    </Text>
                    <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 2 }}>
                      {opt.blurb}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={HUD_COLORS.mintSoft} />
                </Pressable>
              ))}
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}
