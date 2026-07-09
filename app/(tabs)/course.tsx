import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HoleScene } from '../../components/hole/HoleScene';
import { useCourseNav } from '../../components/hole/useCourseNav';
import { Flag } from '../../components/hole/Flag';
import { StopPreviewCard } from '../../components/hole/StopPreviewCard';
import { TodayCard } from '../../components/hole/TodayCard';
import { HintOverlay } from '../../components/hole/HintOverlay';
import { ToggleBar } from '../../components/ui/ToggleBar';
import { useTheme } from '../../lib/theme';
import { pointAtDistance } from '../../lib/holePath';
import { HINT_DISMISSED_KEY, LAST_STOP_KEY, STOPS } from '../../constants/hole';
import { useHabits, useRelapses } from '../../lib/hooks/useHabits';
import { daysClean } from '../../lib/streaks';

export default function CourseScreen() {
  const { width, height } = useWindowDimensions();
  const { scheme } = useTheme();

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

  const { path, stopDists, ballPos, tx, ty, scale, gesture, activeStop, isOverview, goToStop, exitOverview, setBallInstant } =
    useCourseNav(width, height, { onSwipe: dismissHint });

  useEffect(() => {
    AsyncStorage.getItem(LAST_STOP_KEY)
      .then((v) => {
        const i = v == null ? NaN : Number(v);
        if (Number.isInteger(i) && i >= 0 && i < STOPS.length) setBallInstant(i);
      })
      .catch(() => {});
  }, [setBallInstant]);

  const { data: habits = [] } = useHabits();
  const { data: relapses = [] } = useRelapses();
  const stats = useMemo<(string | null)[]>(() => {
    const recovery = habits.filter((h) => h.kind === 'recovery');
    const best = recovery.map((h) => daysClean(h, relapses)).sort((a, b) => b - a)[0];
    return STOPS.map((s) =>
      s.label === 'Recovery' && best !== undefined && best > 0 ? `${best} days clean` : null
    );
  }, [habits, relapses]);

  const enterStop = (index: number) => {
    AsyncStorage.setItem(LAST_STOP_KEY, String(index)).catch(() => {});
    router.push(STOPS[index].route);
  };

  // Overview mode: tapping a flag goes straight into the section.
  const onFlagPress = (index: number) => {
    if (isOverview) {
      setBallInstant(index);
      enterStop(index);
    } else {
      goToStop(index);
    }
  };

  const stopScenePos = useMemo(() => stopDists.map((d) => pointAtDistance(path, d)), [path, stopDists]);

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1 }}>
          <HoleScene
            width={width}
            height={height}
            ballPos={ballPos}
            tx={tx}
            ty={ty}
            scale={scale}
            scheme={scheme}
            path={path}
          />
        </View>
      </GestureDetector>
      {STOPS.map((stop, i) => (
        <Flag
          key={stop.label}
          stop={stop}
          scenePos={stopScenePos[i]}
          tx={tx}
          ty={ty}
          scale={scale}
          active={activeStop === i || isOverview}
          anchor={i === STOPS.length - 1 ? 'below' : 'above'}
          onPress={() => onFlagPress(i)}
        />
      ))}
      {activeStop != null && !isOverview ? (
        <StopPreviewCard stop={STOPS[activeStop]} stat={stats[activeStop]} onEnter={() => enterStop(activeStop)} />
      ) : null}
      <HintOverlay visible={hintVisible && !isOverview} />
      {!isOverview ? <TodayCard /> : null}
      <ToggleBar active="course" />
    </View>
  );
}
