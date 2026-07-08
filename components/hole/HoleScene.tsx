import React, { useMemo } from 'react';
import {
  Canvas,
  Circle,
  Fill,
  Group,
  Image as SkiaImage,
  Path as SkiaPath,
  Shadow,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import { useDerivedValue, type DerivedValue } from 'react-native-reanimated';
import type { HolePath, Vec } from '../../lib/holePath';
import {
  BALL_RADIUS,
  HOLE_IMAGE,
  SCENE,
  SCENE_COLORS,
  SHOW_PATH_DEBUG,
} from '../../constants/hole';

// DerivedValue<T> is Readonly<SharedValue<T>> — accepts both plain shared
// values (Task 5's static camera) and derived ones (useCourseNav's camera).
type HoleSceneProps = {
  width: number; // screen px
  height: number;
  ballPos: DerivedValue<Vec>; // scene px
  tx: DerivedValue<number>; // camera translate, screen px
  ty: DerivedValue<number>;
  scale: DerivedValue<number>; // screen px per scene px
  scheme: 'light' | 'dark';
  path: HolePath;
};

export function HoleScene({ width, height, ballPos, tx, ty, scale, scheme, path }: HoleSceneProps) {
  const image = useImage(HOLE_IMAGE);

  const transform = useDerivedValue(() => [
    { translateX: tx.value },
    { translateY: ty.value },
    { scale: scale.value },
  ]);
  const ballCx = useDerivedValue(() => ballPos.value.x);
  const ballCy = useDerivedValue(() => ballPos.value.y);

  const debugPath = useMemo(() => {
    if (!SHOW_PATH_DEBUG) return null;
    const p = Skia.Path.Make();
    p.moveTo(path.pts[0].x, path.pts[0].y);
    for (const pt of path.pts) p.lineTo(pt.x, pt.y);
    return p;
  }, [path]);

  return (
    <Canvas style={{ width, height }}>
      {image ? (
        <Group transform={transform}>
          <SkiaImage image={image} x={0} y={0} width={SCENE.width} height={SCENE.height} fit="fill" />
          {debugPath ? (
            <SkiaPath path={debugPath} color="red" style="stroke" strokeWidth={4} />
          ) : null}
          <Circle cx={ballCx} cy={ballCy} r={BALL_RADIUS} color={SCENE_COLORS.ball}>
            <Shadow dx={0} dy={3} blur={6} color={SCENE_COLORS.ballShadow} />
          </Circle>
        </Group>
      ) : (
        // Loading OR decode failure: plain fairway green so the screen (and,
        // after Task 6, navigation) still works.
        <Fill color={SCENE_COLORS.fallback} />
      )}
      {scheme === 'dark' ? <Fill color={SCENE_COLORS.duskTint} /> : null}
    </Canvas>
  );
}
