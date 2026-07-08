import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, type DerivedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Vec } from '../../lib/holePath';
import type { HoleStop } from '../../constants/hole';
import { useTheme } from '../../lib/theme';

const FLAG_SIZE = 34;

type FlagProps = {
  stop: HoleStop;
  scenePos: Vec; // stop position in scene px (static)
  tx: DerivedValue<number>;
  ty: DerivedValue<number>;
  scale: DerivedValue<number>;
  active: boolean;
  onPress: () => void;
};

export function Flag({ stop, scenePos, tx, ty, scale, active, onPress }: FlagProps) {
  const { colors } = useTheme();

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: scenePos.x * scale.value + tx.value - FLAG_SIZE / 2 },
      // Anchor the chip just above the spot on the course it marks.
      { translateY: scenePos.y * scale.value + ty.value - FLAG_SIZE - 6 },
      { scale: withSpring(active ? 1.2 : 1) },
    ],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      <Pressable
        onPress={onPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`Go to ${stop.label}`}
        style={{
          width: FLAG_SIZE,
          height: FLAG_SIZE,
          borderRadius: FLAG_SIZE / 2,
          backgroundColor: active ? colors.primary : colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <Ionicons name={stop.icon} size={18} color={active ? colors.onPrimary : colors.text} />
      </Pressable>
    </Animated.View>
  );
}
