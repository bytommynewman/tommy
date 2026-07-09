import { useCallback, useMemo, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { buildHolePath, clamp, nearestStop, pointAtDistance } from '../../lib/holePath';
import {
  cameraOffset,
  centerOffset,
  coverScale,
  dragDelta,
  isOverviewZoom,
  pathBounds,
  tiltFor,
} from '../../lib/courseNav';
import {
  CAMERA_ZOOM,
  SCENE,
  STOPS,
  STOP_NEAR_THRESHOLD,
  WALK_PIVOT_Y,
  WALK_TILT,
  WAYPOINTS,
} from '../../constants/hole';

const ZOOM_MS = 350;
const OVERVIEW_MARGIN = 120; // scene px of photo kept around the path in overview
const GLIDE_DECELERATION = 0.995; // gentle glide-to-rest, no flick-jumps

// Satellite-feed camera: a pan gesture drags the camera 1:1 along the traced
// fairway (no stops, no snapping); pinch toggles travel <-> whole-hole cover
// framing. `onSettle` reports the camera fraction for persistence.
export function useSatelliteNav(
  screenW: number,
  screenH: number,
  opts?: { onInteract?: () => void; onSettle?: (frac: number) => void }
) {
  const path = useMemo(() => buildHolePath(WAYPOINTS), []);
  const stopDists = useMemo(() => STOPS.map((s) => s.frac * path.total), [path]);
  const bounds = useMemo(() => pathBounds(path, OVERVIEW_MARGIN, SCENE.width, SCENE.height), [path]);
  const reduceMotion = useReducedMotion();

  const travelScale = (screenW / SCENE.width) * CAMERA_ZOOM;
  const fitScale = useMemo(() => coverScale(screenW, screenH, bounds), [screenW, screenH, bounds]);

  const cameraDist = useSharedValue(0);
  const scale = useSharedValue(travelScale);
  const hapticsArmed = useSharedValue(false);

  const camPos = useDerivedValue(() => pointAtDistance(path, cameraDist.value));
  const overviewNow = useDerivedValue(() => isOverviewZoom(scale.value, travelScale, fitScale));

  const tx = useDerivedValue(() =>
    overviewNow.value
      ? centerOffset(screenW, bounds.x, bounds.w, scale.value)
      : cameraOffset(screenW, SCENE.width * scale.value, screenW / 2 - camPos.value.x * scale.value)
  );
  // In travel mode the camera "stands" at the walking pivot; the tilt pitches
  // the plane about that same line so your position stays under your feet.
  const ty = useDerivedValue(() =>
    overviewNow.value
      ? centerOffset(screenH, bounds.y, bounds.h, scale.value)
      : cameraOffset(screenH, SCENE.height * scale.value, screenH * WALK_PIVOT_Y - camPos.value.y * scale.value)
  );

  const tilt = useDerivedValue(() => tiltFor(scale.value, travelScale, fitScale, WALK_TILT));
  const pivotY = screenH * WALK_PIVOT_Y;

  const [activeStop, setActiveStop] = useState<number | null>(0);
  const [isOverview, setIsOverview] = useState(false);

  const onStopChange = useCallback((index: number, buzz: boolean) => {
    setActiveStop(index >= 0 ? index : null);
    if (index >= 0 && buzz) Haptics.selectionAsync();
  }, []);

  const nearIndex = useDerivedValue(() => {
    const n = nearestStop(stopDists, cameraDist.value);
    return n.gap <= STOP_NEAR_THRESHOLD ? n.index : -1;
  });
  useAnimatedReaction(
    () => nearIndex.value,
    (curr, prev) => {
      if (curr !== prev) runOnJS(onStopChange)(curr, hapticsArmed.value);
    }
  );
  useAnimatedReaction(
    () => overviewNow.value,
    (curr, prev) => {
      if (curr !== prev) runOnJS(setIsOverview)(curr);
    }
  );

  const onInteract = opts?.onInteract;
  const notifyInteract = useCallback(() => onInteract?.(), [onInteract]);
  const onSettle = opts?.onSettle;
  const notifySettle = useCallback(
    (dist: number) => onSettle?.(path.total === 0 ? 0 : dist / path.total),
    [onSettle, path.total]
  );

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .maxPointers(1)
      .onStart(() => {
        hapticsArmed.value = true;
        runOnJS(notifyInteract)();
      })
      .onChange((e) => {
        if (overviewNow.value) return; // overview is a fixed full-hole frame
        cameraDist.value = clamp(cameraDist.value + dragDelta(e.changeY, scale.value), 0, path.total);
      })
      .onEnd((e) => {
        if (overviewNow.value) return;
        cameraDist.value = withDecay(
          {
            velocity: dragDelta(e.velocityY, scale.value),
            deceleration: GLIDE_DECELERATION,
            clamp: [0, path.total],
          },
          () => runOnJS(notifySettle)(cameraDist.value)
        );
      });

    const pinchStart = { value: 1 };
    const pinch = Gesture.Pinch()
      .onStart(() => {
        pinchStart.value = scale.value;
        runOnJS(notifyInteract)();
      })
      .onUpdate((e) => {
        scale.value = clamp(
          pinchStart.value * e.scale,
          Math.min(fitScale, travelScale),
          Math.max(fitScale, travelScale)
        );
      })
      .onEnd(() => {
        const target = isOverviewZoom(scale.value, travelScale, fitScale) ? fitScale : travelScale;
        scale.value = reduceMotion ? target : withTiming(target, { duration: ZOOM_MS });
      });

    return Gesture.Simultaneous(pan, pinch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path.total, fitScale, travelScale, reduceMotion, notifyInteract, notifySettle]);

  const setCameraInstant = useCallback(
    (frac: number) => {
      cameraDist.value = clamp(frac, 0, 1) * path.total;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path.total]
  );

  return { path, stopDists, tx, ty, scale, tilt, pivotY, gesture, activeStop, isOverview, setCameraInstant };
}
