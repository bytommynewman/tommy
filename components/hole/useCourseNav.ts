import { useCallback, useMemo, useState } from 'react';
import { Directions, Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { buildHolePath, clamp, nearestStop, pointAtDistance } from '../../lib/holePath';
import { cameraOffset, isOverviewZoom, stepStop } from '../../lib/courseNav';
import { CAMERA_ZOOM, SCENE, STOPS, STOP_NEAR_THRESHOLD, WAYPOINTS } from '../../constants/hole';

const TRAVEL_MS = 700;
const ZOOM_MS = 350;

export function useCourseNav(screenW: number, screenH: number, opts?: { onSwipe?: () => void }) {
  const path = useMemo(() => buildHolePath(WAYPOINTS), []);
  const stopDists = useMemo(() => STOPS.map((s) => s.frac * path.total), [path]);
  const reduceMotion = useReducedMotion();

  const travelScale = (screenW / SCENE.width) * CAMERA_ZOOM;
  const fitScale = Math.min(screenW / SCENE.width, screenH / SCENE.height);

  const ballDist = useSharedValue(0);
  const stopIndex = useSharedValue(0); // authoritative current stop for stepping
  const scale = useSharedValue(travelScale);
  const hapticsArmed = useSharedValue(false);

  const ballPos = useDerivedValue(() => pointAtDistance(path, ballDist.value));
  const tx = useDerivedValue(() =>
    cameraOffset(screenW, SCENE.width * scale.value, screenW / 2 - ballPos.value.x * scale.value)
  );
  const ty = useDerivedValue(() =>
    cameraOffset(screenH, SCENE.height * scale.value, screenH * 0.55 - ballPos.value.y * scale.value)
  );

  const [activeStop, setActiveStop] = useState<number | null>(0);
  const [isOverview, setIsOverview] = useState(false);

  const onStopChange = useCallback((index: number, buzz: boolean) => {
    setActiveStop(index >= 0 ? index : null);
    if (index >= 0 && buzz) Haptics.selectionAsync();
  }, []);

  const nearIndex = useDerivedValue(() => {
    const n = nearestStop(stopDists, ballDist.value);
    return n.gap <= STOP_NEAR_THRESHOLD ? n.index : -1;
  });
  useAnimatedReaction(
    () => nearIndex.value,
    (curr, prev) => {
      if (curr !== prev) runOnJS(onStopChange)(curr, hapticsArmed.value);
    }
  );

  const overviewNow = useDerivedValue(() => isOverviewZoom(scale.value, travelScale, fitScale));
  useAnimatedReaction(
    () => overviewNow.value,
    (curr, prev) => {
      if (curr !== prev) runOnJS(setIsOverview)(curr);
    }
  );

  const onSwipe = opts?.onSwipe;
  const notifySwipe = useCallback(() => {
    onSwipe?.();
  }, [onSwipe]);

  const gesture = useMemo(() => {
    const travelTo = (index: number) => {
      'worklet';
      stopIndex.value = index;
      ballDist.value = reduceMotion
        ? stopDists[index]
        : withTiming(stopDists[index], { duration: TRAVEL_MS, easing: Easing.inOut(Easing.cubic) });
    };
    const swipe = (direction: 1 | -1) => {
      'worklet';
      hapticsArmed.value = true;
      travelTo(stepStop(stopIndex.value, direction, stopDists.length));
      runOnJS(notifySwipe)();
    };
    // Swipe up = ball travels UP the hole (forward); down = back toward the tee.
    const flingUp = Gesture.Fling().direction(Directions.UP).onEnd(() => swipe(1));
    const flingDown = Gesture.Fling().direction(Directions.DOWN).onEnd(() => swipe(-1));

    const pinchStart = { value: 1 };
    const pinch = Gesture.Pinch()
      .onStart(() => {
        pinchStart.value = scale.value;
        runOnJS(notifySwipe)();
      })
      .onUpdate((e) => {
        scale.value = clamp(pinchStart.value * e.scale, fitScale, travelScale);
      })
      .onEnd(() => {
        // Settle to whichever mode we're closer to.
        const target = isOverviewZoom(scale.value, travelScale, fitScale) ? fitScale : travelScale;
        scale.value = reduceMotion ? target : withTiming(target, { duration: ZOOM_MS });
      });

    return Gesture.Race(pinch, Gesture.Exclusive(flingUp, flingDown));
  }, [stopDists, reduceMotion, travelScale, fitScale, notifySwipe]);

  const goToStop = useCallback(
    (index: number) => {
      hapticsArmed.value = true;
      stopIndex.value = index;
      ballDist.value = reduceMotion
        ? stopDists[index]
        : withTiming(stopDists[index], { duration: TRAVEL_MS, easing: Easing.inOut(Easing.cubic) });
    },
    [stopDists, reduceMotion]
  );

  const exitOverview = useCallback(() => {
    scale.value = reduceMotion ? travelScale : withTiming(travelScale, { duration: ZOOM_MS });
  }, [reduceMotion, travelScale]);

  const setBallInstant = useCallback(
    (index: number) => {
      stopIndex.value = index;
      ballDist.value = stopDists[index];
    },
    [stopDists]
  );

  return { path, stopDists, ballPos, tx, ty, scale, gesture, activeStop, isOverview, goToStop, exitOverview, setBallInstant };
}
