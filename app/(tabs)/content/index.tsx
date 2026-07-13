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
    name: 'IDEA ENGINE',
    route: '/content/ideas',
    options: [
      { icon: 'radio-outline', label: 'radio scratch for ideas', sub: '5 fresh reel concepts, tuned to your niche' },
      { icon: 'bulb-outline', label: 'browse the board', sub: 'keep, plan, film, post — track every concept' },
    ],
  },
  {
    key: 'editor',
    image: require('../../../assets/clubhouse/screening.jpg'),
    name: 'CUTTING ROOM',
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
    name: 'INTEL STUDY',
    route: '/content/stats',
    options: [
      { icon: 'stats-chart-outline', label: '@bytommynewman live intel', sub: 'followers, views, reach — synced from instagram' },
      { icon: 'trophy-outline', label: 'signal by reel', sub: 'which posts are hitting, ranked' },
    ],
  },
];

export default function ContentHouse() {
  const insets = useSafeAreaInsets();
  const [entered, setEntered] = useState(false);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;

  const enter = () => {
    setEntered(true);
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  };

  const backToCourse = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/course');
  };

  if (!entered) {
    return (
      <Pressable
        onPress={enter}
        accessibilityRole="button"
        accessibilityLabel="Enter the clubhouse"
        style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}
      >
        <Image
          source={require('../../../assets/clubhouse/exterior.jpg')}
          style={{ flex: 1, width: '100%' }}
          resizeMode="cover"
        />
        <Pressable
          onPress={backToCourse}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back to the course"
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: 14,
            width: 34,
            height: 34,
            borderRadius: HUD_RADIUS,
            borderWidth: 0.75,
            borderColor: HUD_COLORS.lineBright,
            backgroundColor: 'rgba(4, 20, 16, 0.7)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="arrow-back" size={18} color={HUD_COLORS.mint} />
        </Pressable>
      </Pressable>
    );
  }

  return (
    <Animated.View
      style={{ flex: 1, backgroundColor: HUD_COLORS.bg, opacity: fade }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {ROOMS.map((room) => (
            <View key={room.key} style={{ width, flex: 1 }}>
              <Image source={room.image} style={{ position: 'absolute', width, height: '100%' }} resizeMode="cover" />
              <View style={{ position: 'absolute', width, height: '100%', backgroundColor: 'rgba(4, 20, 16, 0.35)' }} />
              <View style={{ flex: 1, justifyContent: 'flex-end', padding: 16, paddingBottom: insets.bottom + 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Ionicons name="golf-outline" size={13} color={MONEY_COLORS.brass} />
                  <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 14, color: HUD_COLORS.text, letterSpacing: 2 }}>
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
                      backgroundColor: 'rgba(4, 36, 27, 0.88)',
                      borderWidth: 0.75,
                      borderColor: HUD_COLORS.lineBright,
                      borderRadius: HUD_RADIUS,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons name={option.icon} size={18} color={HUD_COLORS.mint} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 12, color: HUD_COLORS.text }}>
                        {option.label}
                      </Text>
                      <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 2 }}>
                        {option.sub}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={HUD_COLORS.mintSoft} />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <Pressable
        onPress={backToCourse}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Back to the course"
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 14,
          width: 34,
          height: 34,
          borderRadius: HUD_RADIUS,
          borderWidth: 0.75,
          borderColor: HUD_COLORS.lineBright,
          backgroundColor: 'rgba(4, 20, 16, 0.7)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="arrow-back" size={18} color={HUD_COLORS.mint} />
      </Pressable>

      <View
        style={{
          position: 'absolute',
          top: insets.top + 16,
          right: 16,
          flexDirection: 'row',
          gap: 5,
        }}
      >
        {ROOMS.map((room, i) => (
          <View
            key={room.key}
            style={{
              width: i === page ? 14 : 5,
              height: 5,
              borderRadius: 999,
              backgroundColor: i === page ? HUD_COLORS.mint : 'rgba(225, 245, 238, 0.4)',
            }}
          />
        ))}
      </View>
    </Animated.View>
  );
}
