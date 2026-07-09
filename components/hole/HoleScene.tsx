import React, { useMemo } from 'react';
import {
  Canvas,
  ColorMatrix,
  DashPathEffect,
  Fill,
  FilterMode,
  Group,
  Image as SkiaImage,
  MipmapMode,
  Path as SkiaPath,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import { useDerivedValue, type DerivedValue } from 'react-native-reanimated';
import type { HolePath } from '../../lib/holePath';
import {
  HOLE_IMAGE,
  SCENE,
  SCENE_COLORS,
  SHOW_PATH_DEBUG,
  WALK_PERSPECTIVE,
} from '../../constants/hole';

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

// Dash pattern in scene px, tuned for the 1600px-wide scene.
const DASH_ON = 22;
const DASH_OFF = 16;

// Mild saturation boost (~1.25x) so the treated turf still reads vivid
// through the satellite tint. Standard luminance-preserving saturation matrix.
const TURF_SATURATION = [
  1.19675, -0.17875, -0.018, 0, 0,
  -0.05325, 1.07125, -0.018, 0, 0,
  -0.05325, -0.17875, 1.232, 0, 0,
  0, 0, 0, 1, 0,
];

export function HoleScene({ width, height, tx, ty, scale, tilt, pivotY, path }: HoleSceneProps) {
  const image = useImage(HOLE_IMAGE);

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

  // Dashes are static: the crawl animation forced a full-canvas redraw every
  // frame even when idle, costing real GPU on-device for a subtle effect.

  return (
    <Canvas style={{ width, height }}>
      {image ? (
        <Group transform={perspectiveTransform} origin={{ x: width / 2, y: pivotY }}>
          <Group transform={transform}>
            <SkiaImage
              image={image}
              x={0}
              y={0}
              width={SCENE.width}
              height={SCENE.height}
              fit="fill"
              sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.Linear }}
            >
              <ColorMatrix matrix={TURF_SATURATION} />
            </SkiaImage>
            <SkiaPath
              path={skPath}
              color={SCENE_COLORS.pathLine}
              style="stroke"
              strokeWidth={8}
              opacity={0.85}
            >
              <DashPathEffect intervals={[DASH_ON, DASH_OFF]} phase={0} />
            </SkiaPath>
            {SHOW_PATH_DEBUG ? (
              <SkiaPath path={skPath} color="red" style="stroke" strokeWidth={4} />
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
