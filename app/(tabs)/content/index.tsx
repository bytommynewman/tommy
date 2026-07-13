import React, { useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS, MONEY_COLORS } from '../../../constants/hud';

// The content clubhouse. Outside: just the house, no writing — tap to walk
// in. Inside: drag room to room; each room's options appear over the photo.

type OptionRow = { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string };
type RoomPanel = {
  key: string;
  image: number;
  name: string;
  route: '/content/ideas' | '/content/editor' | '/content/stats';
  options: OptionRow[];
};

const ROOMS: RoomPanel[] = [
  {
    key: 'ideas',
    image: require('../../../assets/clubhouse/ready.jpg'),
    name: 'THE RANGE',
    route: '/content/ideas',
    options: [
      { icon: 'radio-outline', label: 'radio scratch for ideas', sub: '5 fresh reel concepts, tuned to your niche' },
      { icon: 'bulb-outline', label: 'browse the board', sub: 'keep, plan, film, post — track every concept' },
    ],
  },
  {
    key: 'editor',
    image: require('../../../assets/clubhouse/screening.jpg'),
    name: 'THE STUDIO',
    route: '/content/editor',
    options: [
      { icon: 'flash-outline', label: 'auto-cut a reel', sub: 'clips in → captions, zooms, transitions burned in' },
      { icon: 'color-filter-outline', label: 'filters & pace', sub: 'boost · muted · contrast · greyscale · fast/chill' },
      { icon: 'musical-notes-outline', label: 'add music', sub: 'drop any track under the cut' },
      { icon: 'chatbubbles-outline', label: 'director ai', sub: 'tell him the change — he recuts the plan' },
    ],
  },
  {
    key: 'stats',
    image: require('../../../assets/clubhouse/cutting.jpg'),
    name: 'TROPHY ROOM',
    route: '/content/stats',
    options: [
      { icon: 'stats-chart-outline', label: '@bytommynewman live stats', sub: 'followers, views, reach — synced from instagram' },
      { icon: 'trophy-outline', label: 'signal by reel', sub: 'which posts are hitting, ranked' },
    ],
  },
];

export default function ContentHouse() {
  const insets = useSafeAreaInsets();
  const [entered, setEntered] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const fade = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;
  const panelW = size.w;

  const enter = () => {
    setEntered(true);
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  };

  const backToCourse = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/course');
  };

  const onLayout = (e: { nativeEvent: { layout: { width: number; height: number } } }) =>
    setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const backButton = (
    <Pressable
      onPress={backToCourse}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Back to the course"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 14,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(10, 25, 17, 0.65)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="arrow-back" size={18} color={HUD_COLORS.text} />
    </Pressable>
  );

  // Outside: just the house on its lawn — pannable, no writing. Tap to enter.
  if (!entered) {
    const imgW = Math.max(size.h * (1200 / 900), size.w);
    return (
      <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }} onLayout={onLayout}>
        {size.h > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            bounces={false}
            contentOffset={{ x: Math.max((imgW - size.w) / 2, 0), y: 0 }}
          >
            <Pressable onPress={enter} accessibilityRole="button" accessibilityLabel="Enter the clubhouse">
              <Image
                source={require('../../../assets/clubhouse/exterior.jpg')}
                style={{ width: imgW, height: size.h }}
                resizeMode="cover"
              />
            </Pressable>
          </ScrollView>
        ) : null}
        {backButton}
      </View>
    );
  }

  // Inside: you WALK through the house. Dragging up pushes the camera
  // forward — the current room grows around you and dissolves through the
  // doorway into the next. One flick = one room deeper.
  const H = size.h;
  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#000', opacity: fade }} onLayout={onLayout}>
      {H > 0
        ? ROOMS.map((room, i) => {
            const start = i * H;
            const end = (i + 1) * H;
            const scale = scrollX.interpolate({
              inputRange: [start - H, start, end],
              outputRange: [0.94, 1, 1.65],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange: [start - H * 0.55, start, end - H * 0.2, end],
              outputRange: [0, 1, 1, 0],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={room.key}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  opacity,
                  transform: [{ scale }],
                }}
              >
                <Image source={room.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                <View
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(10, 25, 17, 0.08)',
                  }}
                />
              </Animated.View>
            );
          })
        : null}

      {H > 0 ? (
        <Animated.ScrollView
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          showsVerticalScrollIndicator={false}
          snapToInterval={H}
          disableIntervalMomentum
          decelerationRate="fast"
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollX } } }], {
            useNativeDriver: true,
          })}
          scrollEventThrottle={16}
          contentContainerStyle={{ height: H * ROOMS.length }}
        >
          {ROOMS.map((room, i) => {
            const start = i * H;
            const cardOpacity = scrollX.interpolate({
              inputRange: [start - H * 0.35, start, start + H * 0.5, start + H * 0.85],
              outputRange: [0, 1, 1, 0],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={room.key}
                style={{
                  position: 'absolute',
                  top: start,
                  width: '100%',
                  height: H,
                  justifyContent: 'flex-end',
                  padding: 16,
                  paddingBottom: insets.bottom + 30,
                  opacity: cardOpacity,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Ionicons name="golf-outline" size={13} color={MONEY_COLORS.brass} />
                  <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 16, color: '#FFFFFF', letterSpacing: 1 }}>
                    {room.name}
                  </Text>
                </View>
                {room.options.map((option) => (
                  <Pressable
                    key={option.label}
                    onPress={() => router.replace(room.route)}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: 'rgba(12, 26, 18, 0.72)',
                      borderRadius: HUD_RADIUS,
                      padding: 13,
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons name={option.icon} size={18} color={HUD_COLORS.mint} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 13, color: '#FFFFFF' }}>
                        {option.label}
                      </Text>
                      <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 2 }}>
                        {option.sub}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={HUD_COLORS.mintSoft} />
                  </Pressable>
                ))}
              </Animated.View>
            );
          })}
        </Animated.ScrollView>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: insets.bottom + 8,
          width: '100%',
          alignItems: 'center',
          opacity: scrollX.interpolate({ inputRange: [0, H * 0.25 || 1], outputRange: [1, 0], extrapolate: 'clamp' }),
        }}
      >
        <Ionicons name="chevron-up" size={16} color="#FFFFFF" />
        <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: '#FFFFFF', opacity: 0.85 }}>
          drag up — walk through the house
        </Text>
      </Animated.View>

      {backButton}
    </Animated.View>
  );
}
