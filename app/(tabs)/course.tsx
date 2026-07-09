import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HoleScene } from '../../components/hole/HoleScene';
import { useSatelliteNav } from '../../components/hole/useSatelliteNav';
import { TargetMarker } from '../../components/hole/TargetMarker';
import { FeedChrome } from '../../components/hole/FeedChrome';
import { HintOverlay } from '../../components/hole/HintOverlay';
import { ToggleBar } from '../../components/ui/ToggleBar';
import { pointAtDistance } from '../../lib/holePath';
import { HINT_DISMISSED_KEY, LAST_DIST_KEY, STOPS } from '../../constants/hole';
import { HUD_COLORS } from '../../constants/hud';

export default function CourseScreen() {
  const { width, height } = useWindowDimensions();

  const [hintVisible, setHintVisible] = useState(false);
  const hintWritten = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(HINT_DISMISSED_KEY)
      .then((v) => {
        if (v == null) setHintVisible(true);
      })
      .catch(() => {});
  }, []);
  const dismissHint = useCallback(() => {
    if (!hintWritten.current) {
      hintWritten.current = true;
      AsyncStorage.setItem(HINT_DISMISSED_KEY, '1').catch(() => {});
    }
    setHintVisible(false);
  }, []);

  const persistDist = useCallback((frac: number) => {
    AsyncStorage.setItem(LAST_DIST_KEY, String(frac)).catch(() => {});
  }, []);

  const { path, stopDists, tx, ty, scale, tilt, pivotY, gesture, activeStop, isOverview, setCameraInstant } =
    useSatelliteNav(width, height, { onInteract: dismissHint, onSettle: persistDist });

  useEffect(() => {
    AsyncStorage.getItem(LAST_DIST_KEY)
      .then((v) => {
        const f = v == null ? NaN : Number(v);
        if (Number.isFinite(f) && f >= 0 && f <= 1) setCameraInstant(f);
      })
      .catch(() => {});
  }, [setCameraInstant]);

  const enterStop = (index: number) => {
    const frac = stopDists[index] / (path.total || 1);
    setCameraInstant(frac);
    persistDist(frac);
    router.push(STOPS[index].route);
  };

  const stopScenePos = useMemo(() => stopDists.map((d) => pointAtDistance(path, d)), [path, stopDists]);

  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1 }}>
          <HoleScene width={width} height={height} tx={tx} ty={ty} scale={scale} tilt={tilt} pivotY={pivotY} path={path} />
        </View>
      </GestureDetector>
      {STOPS.map((stop, i) => (
        <TargetMarker
          key={stop.label}
          stop={stop}
          index={i}
          scenePos={stopScenePos[i]}
          tx={tx}
          ty={ty}
          scale={scale}
          tilt={tilt}
          pivotY={pivotY}
          screenW={width}
          active={activeStop === i || isOverview}
          onPress={() => enterStop(i)}
        />
      ))}
      <FeedChrome isOverview={isOverview} onLegendPress={enterStop} />
      <HintOverlay visible={hintVisible && !isOverview} />
      <ToggleBar active="course" />
    </View>
  );
}
