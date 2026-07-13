import { useCallback, useMemo, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
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
  visibleAboveFlat,
} from '../../lib/courseNav';
import {
  CAMERA_ZOOM,
  SCENE,
  STOPS,
  STOP_NEAR_THRESHOLD,
  WALK_PERSPECTIVE,
  WALK_PIVOT_Y,
  WALK_TILT,
  WAYPOINTS,
} from '../../constants/hole';

const ZOOM_MS = 350;
const OVERVIEW_MARGIN = 240; // scene px of photo kept around the path in overview
const GLIDE_DECELERATION = 0.996; // gentle glide-to-rest, no flick-jumps

// Satellite-feed camera: a pan gesture drags the camera 1:1 along the traced
// fairway (no stops, no snapping); pinch toggles travel <-> whole-hole cover
// framing.
export function useSatelliteNav(
  screenW: number,
  screenH: number,
  opts?: { onInteract?: () => void }
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
  const pinchActive = useSharedValue(false);

  const camPos = useDerivedValue(() => pointAtDistance(path, cameraDist.value));
  const overviewNow = useDerivedValue(() => isOverviewZoom(scale.value, travelScale, fitScale));
  const tilt = useDerivedValue(() => tiltFor(scale.value, travelScale, fitScale, WALK_TILT));
  const pivotY = screenH * WALK_PIVOT_Y;

  // 0 at full travel zoom, 1 at the overview fit. Framing BLENDS between the
  // walk (camera at the pivot) and the whole-hole frame along this progress,
  // so zooming out is one continuous glide — no mid-zoom view jump.
  const overviewProgress = useDerivedValue(() => {
    const span = travelScale - fitScale;
    if (Math.abs(span) < 1e-9) return 0;
    return clamp((travelScale - scale.value) / span, 0, 1);
  });

  const tx = useDerivedValue(() => {
    const walk = cameraOffset(screenW, SCENE.width * scale.value, screenW / 2 - camPos.value.x * scale.value);
    const whole = centerOffset(screenW, bounds.x, bounds.w, scale.value);
    const p = overviewProgress.value;
    return walk * (1 - p) + whole * p;
  });
  // In travel mode the camera "stands" at the walking pivot; the tilt pitches
  // the plane about that same line so your position stays under your feet.
  // The extra Math.min keeps the tilted view from ever looking past the
  // photo's top edge — real imagery on every pixel.
  const ty = useDerivedValue(() => {
    const flat = cameraOffset(
      screenH,
      SCENE.height * scale.value,
      pivotY - camPos.value.y * scale.value
    );
    const walk = Math.min(flat, pivotY - visibleAboveFlat(pivotY, tilt.value, WALK_PERSPECTIVE));
    const whole = centerOffset(screenH, bounds.y, bounds.h, scale.value);
    const p = overviewProgress.value;
    return walk * (1 - p) + whole * p;
  });

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

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .maxPointers(1)
      .onStart(() => {
        hapticsArmed.value = true;
        runOnJS(notifyInteract)();
      })
      .onChange((e) => {
        // A pinch in progress owns the screen — never walk mid-zoom.
        if (overviewNow.value || pinchActive.value) return;
        cameraDist.value = clamp(cameraDist.value + dragDelta(e.changeY, scale.value), 0, path.total);
      })
      .onEnd((e) => {
        if (overviewNow.value || pinchActive.value) return;
        cameraDist.value = withDecay({
          velocity: dragDelta(e.velocityY, scale.value),
          deceleration: GLIDE_DECELERATION,
          clamp: [0, path.total],
        });
      });

    const pinchStart = { value: 1 };
    const pinch = Gesture.Pinch()
      .onStart(() => {
        pinchActive.value = true;
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
        pinchActive.value = false;
        const target = isOverviewZoom(scale.value, travelScale, fitScale) ? fitScale : travelScale;
        scale.value = reduceMotion ? target : withTiming(target, { duration: ZOOM_MS });
      });

    // Simultaneous so the pinch is always recognized (Race let an accidental
    // one-finger pan lock the zoom out); pinchActive gates the pan handlers
    // so zooming never fights the walk.
    return Gesture.Simultaneous(pan, pinch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path.total, fitScale, travelScale, reduceMotion, notifyInteract]);

  const setCameraInstant = useCallback(
    (frac: number) => {
      cameraDist.value = clamp(frac, 0, 1) * path.total;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path.total]
  );

  // One-tap alternative to pinching: glide between the walk and the full-hole
  // overview. Reads the live scale (not React state, which can lag a frame)
  // so rapid taps always toggle from where the camera actually is.
  const toggleOverview = useCallback(() => {
    const target = isOverviewZoom(scale.value, travelScale, fitScale) ? travelScale : fitScale;
    scale.value = reduceMotion
      ? target
      : withTiming(target, { duration: 450, easing: Easing.inOut(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelScale, fitScale, reduceMotion]);

  // Glide the camera along the fairway to a section (scorecard-row taps).
  // From the overview it also zooms back into the walk, arriving on the
  // section. Never navigates — the target marker is the only "enter" button.
  const goToStop = useCallback(
    (index: number) => {
      // Programmatic flight: disarm haptics so the camera doesn't buzz at
      // every hole it passes; the next real drag re-arms them.
      hapticsArmed.value = false;
      const d = stopDists[index];
      const ease = { duration: 700, easing: Easing.inOut(Easing.cubic) };
      cameraDist.value = reduceMotion ? d : withTiming(d, ease);
      if (scale.value < (travelScale + fitScale) / 2) {
        scale.value = reduceMotion ? travelScale : withTiming(travelScale, ease);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stopDists, travelScale, fitScale, reduceMotion]
  );

  return { path, stopDists, tx, ty, scale, tilt, pivotY, gesture, activeStop, isOverview, setCameraInstant, toggleOverview, goToStop };
}
