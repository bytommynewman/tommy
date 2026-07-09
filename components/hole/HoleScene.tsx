import React, { useEffect, useMemo } from 'react';
import {
  Canvas,
  DashPathEffect,
  Fill,
  Group,
  Image as SkiaImage,
  Path as SkiaPath,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type DerivedValue,
} from 'react-native-reanimated';
import type { HolePath } from '../../lib/holePath';
import { HOLE_IMAGE, SCENE, SCENE_COLORS, SHOW_PATH_DEBUG, WALK_PERSPECTIVE } from '../../constants/hole';

type HoleSceneProps = {
  width: number; // screen px
  height: number;
  tx: DerivedValue<number>; // camera translate, screen px
  ty: DerivedValue<number>;
  scale: DerivedValue<number>; // screen px per scene px
  tilt: DerivedValue<number>; // walking-view pitch, radians (0 in overview)
  pivotY: number; // camera standpoint, screen px
  path: HolePath;
};

const DASH_ON = 16;
const DASH_OFF = 12;

export function HoleScene({ width, height, tx, ty, scale, tilt, pivotY, path }: HoleSceneProps) {
  const image = useImage(HOLE_IMAGE);
  const reduceMotion = useReducedMotion();

  const transform = useDerivedValue(() => [
    { translateX: tx.value },
    { translateY: ty.value },
    { scale: scale.value },
  ]);
  // Walking view: pitch the whole photo plane about the camera standpoint.
  // Same [{perspective}, {rotateX}] model the markers replicate in
  // projectPerspective, so overlays stay pinned to the ground.
  const perspectiveTransform = useDerivedValue(() => [
    { perspective: WALK_PERSPECTIVE },
    { rotateX: tilt.value },
  ]);

  const skPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(path.pts[0].x, path.pts[0].y);
    for (const pt of path.pts) p.lineTo(pt.x, pt.y);
    return p;
  }, [path]);

  // Slow dash crawl so the feed reads "live"; static under reduced motion.
  const dashPhase = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    dashPhase.value = withRepeat(
      withTiming(-(DASH_ON + DASH_OFF), { duration: 1200, easing: Easing.linear }),
      -1
    );
    return () => cancelAnimation(dashPhase);
  }, [reduceMotion, dashPhase]);

  return (
    <Canvas style={{ width, height }}>
      {image ? (
        <Group transform={perspectiveTransform} origin={{ x: width / 2, y: pivotY }}>
          <Group transform={transform}>
            <SkiaImage image={image} x={0} y={0} width={SCENE.width} height={SCENE.height} fit="fill" />
            <SkiaPath
              path={skPath}
              color={SCENE_COLORS.pathLine}
              style="stroke"
              strokeWidth={4}
              opacity={0.85}
            >
              <DashPathEffect intervals={[DASH_ON, DASH_OFF]} phase={dashPhase} />
            </SkiaPath>
            {SHOW_PATH_DEBUG ? (
              <SkiaPath path={skPath} color="red" style="stroke" strokeWidth={2} />
            ) : null}
          </Group>
        </Group>
      ) : (
        // Loading OR decode failure: plain fairway green so the HUD overlays
        // and navigation still work over a flat field.
        <Fill color={SCENE_COLORS.fallback} />
      )}
      <Fill color={SCENE_COLORS.satelliteTint} />
    </Canvas>
  );
}
