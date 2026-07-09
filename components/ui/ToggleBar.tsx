import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HUD_COLORS, HUD_FONT } from '../../constants/hud';

export const TOGGLE_BAR_CLEARANCE = 76; // bar height (60) + gap (16)

const SEGMENT_WIDTH = 132;
const BAR_PADDING = 5;

type ToggleBarProps = { active: 'scratch' | 'course' };

const items = [
  { key: 'scratch' as const, label: 'Scratch AI', icon: 'sparkles' as const, route: '/' as const },
  { key: 'course' as const, label: 'Sections', icon: 'golf' as const, route: '/course' as const },
];

export function ToggleBar({ active }: ToggleBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = active === 'scratch' ? 0 : 1;

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(activeIndex * SEGMENT_WIDTH, { damping: 18, stiffness: 180 }) }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 16, alignItems: 'center' }}
    >
      <View
        style={{
          flexDirection: 'row',
          padding: BAR_PADDING,
          borderRadius: 999,
          backgroundColor: HUD_COLORS.panel,
          borderWidth: 0.75,
          borderColor: HUD_COLORS.line,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: BAR_PADDING,
              left: BAR_PADDING,
              width: SEGMENT_WIDTH,
              height: 50,
              borderRadius: 999,
              backgroundColor: HUD_COLORS.panelDeep,
              borderWidth: 0.75,
              borderColor: HUD_COLORS.lineBright,
            },
            indicatorStyle,
          ]}
        />
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${item.label}`}
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                if (isActive) return;
                Haptics.selectionAsync();
                router.replace(item.route);
              }}
              style={{
                width: SEGMENT_WIDTH,
                height: 50,
                borderRadius: 999,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons name={item.icon} size={16} color={isActive ? HUD_COLORS.mint : HUD_COLORS.mintSoft} />
              <Text
                style={{
                  fontFamily: HUD_FONT,
                  fontSize: 12,
                  color: isActive ? HUD_COLORS.mint : HUD_COLORS.mintSoft,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
