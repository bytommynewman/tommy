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

  // Inside: one continuous space — drag and the rooms slide past with
  // parallax depth; a room's options fade up as it arrives.
  return (
    <Animated.View style={{ flex: 1, backgroundColor: HUD_COLORS.bg, opacity: fade }} onLayout={onLayout}>
      {size.w > 0 ? (
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="normal"
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: true,
          })}
          scrollEventThrottle={16}
        >
          {ROOMS.map((room, i) => {
            const center = i * panelW;
            const parallax = scrollX.interpolate({
              inputRange: [center - panelW, center, center + panelW],
              outputRange: [panelW * 0.26, 0, -panelW * 0.26],
              extrapolate: 'clamp',
            });
            const focus = scrollX.interpolate({
              inputRange: [center - panelW * 0.75, center, center + panelW * 0.75],
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <View key={room.key} style={{ width: panelW, overflow: 'hidden' }}>
                <Animated.Image
                  source={room.image}
                  style={{
                    position: 'absolute',
                    width: panelW * 1.6,
                    height: '100%',
                    left: -panelW * 0.3,
                    transform: [{ translateX: parallax }],
                  }}
                  resizeMode="cover"
                />
                <View
                  style={{
                    position: 'absolute',
                    width: panelW,
                    height: '100%',
                    backgroundColor: 'rgba(10, 25, 17, 0.12)',
                  }}
                />
                <Animated.View
                  style={{
                    flex: 1,
                    justifyContent: 'flex-end',
                    padding: 14,
                    paddingBottom: insets.bottom + 24,
                    opacity: focus,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Ionicons name="golf-outline" size={13} color={MONEY_COLORS.brass} />
                    <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 15, color: HUD_COLORS.text, letterSpacing: 1 }}>
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
                        backgroundColor: 'rgba(16, 35, 23, 0.78)',
                        borderRadius: HUD_RADIUS,
                        padding: 13,
                        marginBottom: 8,
                      }}
                    >
                      <Ionicons name={option.icon} size={18} color={HUD_COLORS.mint} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 13, color: HUD_COLORS.text }}>
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
              </View>
            );
          })}
        </Animated.ScrollView>
      ) : null}
      {backButton}
    </Animated.View>
  );
}
