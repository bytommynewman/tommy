import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HUD_COLORS, HUD_FONT, HUD_RADIUS } from '../../constants/hud';
import { STOPS } from '../../constants/hole';

function Bracket({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base = { position: 'absolute' as const, width: 18, height: 18, borderColor: HUD_COLORS.mint, opacity: 0.7 };
  const pos = {
    tl: { top: 0, left: 0, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
    tr: { top: 0, right: 0, borderTopWidth: 1.5, borderRightWidth: 1.5 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
    br: { bottom: 0, right: 0, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  }[corner];
  return <View pointerEvents="none" style={[base, pos]} />;
}

// The non-map layer of the satellite feed: corner brackets, the live/overview
// plate, the course identity plate (the ONLY place the course name appears),
// and the 1-5 legend panel in overview.
export function FeedChrome({
  isOverview,
  onLegendPress,
}: {
  isOverview: boolean;
  onLegendPress: (index: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(withTiming(0.25, { duration: 900 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const plate = {
    backgroundColor: 'rgba(4, 36, 27, 0.8)',
    borderWidth: 0.75,
    borderColor: HUD_COLORS.line,
    borderRadius: HUD_RADIUS,
    paddingHorizontal: 8,
    paddingVertical: 4,
  } as const;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: insets.top + 6, left: 10, right: 10, bottom: 10 }}
      >
        <Bracket corner="tl" />
        <Bracket corner="tr" />
        <Bracket corner="bl" />
        <Bracket corner="br" />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: insets.top + 12,
          left: 16,
          right: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <View style={[plate, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          <Animated.View
            style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: HUD_COLORS.mint }, dotStyle]}
          />
          <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mint }}>
            {isOverview ? 'tactical overview' : 'satellite feed · live'}
          </Text>
        </View>
        <View style={plate}>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft }}>
            TPC Sawgrass · no. 16 · par 5
          </Text>
        </View>
      </View>
      {isOverview ? (
        <View style={[plate, { position: 'absolute', left: 16, bottom: insets.bottom + 110, paddingVertical: 6 }]}>
          {STOPS.map((stop, i) => (
            <Pressable
              key={stop.label}
              onPress={() => onLegendPress(i)}
              accessibilityRole="button"
              accessibilityLabel={`Enter ${stop.label}`}
              style={{ paddingVertical: 3 }}
            >
              <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft }}>
                {`${i + 1} ${stop.label.toLowerCase()}`}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
