import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, type DerivedValue } from 'react-native-reanimated';
import type { Vec } from '../../lib/holePath';
import type { HoleStop } from '../../constants/hole';
import { HUD_COLORS, HUD_FONT } from '../../constants/hud';

const RING = 34;
const WIDTH = 120; // whole marker (ring + plate) is one easy tap target

type TargetMarkerProps = {
  stop: HoleStop;
  index: number;
  scenePos: Vec;
  tx: DerivedValue<number>;
  ty: DerivedValue<number>;
  scale: DerivedValue<number>;
  active: boolean;
  onPress: () => void;
};

export function TargetMarker({ stop, index, scenePos, tx, ty, scale, active, onPress }: TargetMarkerProps) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: scenePos.x * scale.value + tx.value - WIDTH / 2 },
      { translateY: scenePos.y * scale.value + ty.value - RING / 2 },
      { scale: withSpring(active ? 1.12 : 1) },
    ],
  }));

  const color = active ? HUD_COLORS.mint : HUD_COLORS.mintSoft;
  return (
    <Animated.View
      style={[{ position: 'absolute', left: 0, top: 0, width: WIDTH, opacity: active ? 1 : 0.8 }, style]}
    >
      <Pressable
        onPress={onPress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Enter ${stop.label}`}
        style={{ alignItems: 'center' }}
      >
        <View
          style={{
            width: RING,
            height: RING,
            borderRadius: RING / 2,
            borderWidth: 1.5,
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(4, 36, 27, 0.55)',
            shadowColor: HUD_COLORS.mint,
            shadowOpacity: active ? 0.6 : 0,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
        </View>
        <View
          style={{
            marginTop: 4,
            backgroundColor: 'rgba(4, 36, 27, 0.8)',
            borderWidth: 0.75,
            borderColor: active ? HUD_COLORS.lineBright : HUD_COLORS.line,
            borderRadius: 3,
            paddingHorizontal: 7,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.text }}>
            {`${index + 1} · ${stop.label.toLowerCase()}`}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
