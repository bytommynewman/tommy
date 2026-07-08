import { useCallback, useMemo, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  buildHolePath,
  clamp,
  nearestStop,
  pointAtDistance,
  projectToPath,
} from '../../lib/holePath';
import {
  CAMERA_ZOOM,
  DRAG_ZOOM_BOOST,
  SCENE,
  STOPS,
  STOP_NEAR_THRESHOLD,
  WAYPOINTS,
} from '../../constants/hole';

export function useHoleDrag(
  screenW: number,
  screenH: number,
  opts?: { onDragEnd?: () => void }
) {
  const path = useMemo(() => buildHolePath(WAYPOINTS), []);
  const stopDists = useMemo(() => STOPS.map((s) => s.frac * path.total), [path]);
  const reduceMotion = useReducedMotion();

  const baseScale = (screenW / SCENE.width) * CAMERA_ZOOM;
  const ballDist = useSharedValue(0);
  const scale = useSharedValue(baseScale);

  const ballPos = useDerivedValue(() => pointAtDistance(path, ballDist.value));
  // Camera keeps the ball horizontally centered and slightly below the
  // vertical midpoint (traveling "up" the hole reads better with the ball low).
  const tx = useDerivedValue(() =>
    clamp(screenW / 2 - ballPos.value.x * scale.value, screenW - SCENE.width * scale.value, 0)
  );
  const ty = useDerivedValue(() =>
    clamp(screenH * 0.55 - ballPos.value.y * scale.value, screenH - SCENE.height * scale.value, 0)
  );

  const [activeStop, setActiveStop] = useState<number | null>(0);

  const onStopChange = useCallback((index: number) => {
    setActiveStop(index >= 0 ? index : null);
    if (index >= 0) Haptics.selectionAsync();
  }, []);

  const nearIndex = useDerivedValue(() => {
    const n = nearestStop(stopDists, ballDist.value);
    return n.gap <= STOP_NEAR_THRESHOLD ? n.index : -1;
  });
  useAnimatedReaction(
    () => nearIndex.value,
    (curr, prev) => {
      if (curr !== prev) runOnJS(onStopChange)(curr);
    }
  );

  const onDragEnd = opts?.onDragEnd;
  const notifyDragEnd = useCallback(() => {
    onDragEnd?.();
  }, [onDragEnd]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          if (!reduceMotion) {
            scale.value = withTiming(baseScale * DRAG_ZOOM_BOOST, { duration: 250 });
          }
        })
        .onChange((e) => {
          // Finger position (screen px) → scene px → distance along the path.
          const sceneP = {
            x: (e.x - tx.value) / scale.value,
            y: (e.y - ty.value) / scale.value,
          };
          ballDist.value = projectToPath(path, sceneP);
        })
        .onEnd(() => {
          const n = nearestStop(stopDists, ballDist.value);
          ballDist.value = reduceMotion
            ? stopDists[n.index]
            : withSpring(stopDists[n.index], { damping: 18, stiffness: 120 });
          runOnJS(notifyDragEnd)();
        })
        .onFinalize(() => {
          if (!reduceMotion) {
            scale.value = withTiming(baseScale, { duration: 250 });
          }
        }),
    [path, stopDists, reduceMotion, baseScale, notifyDragEnd]
  );

  const goToStop = useCallback(
    (index: number) => {
      ballDist.value = reduceMotion
        ? stopDists[index]
        : withTiming(stopDists[index], { duration: 700, easing: Easing.inOut(Easing.cubic) });
    },
    [stopDists, reduceMotion]
  );

  const setBallInstant = useCallback(
    (index: number) => {
      ballDist.value = stopDists[index];
    },
    [stopDists]
  );

  return { path, stopDists, ballPos, tx, ty, scale, gesture, activeStop, goToStop, setBallInstant };
}
