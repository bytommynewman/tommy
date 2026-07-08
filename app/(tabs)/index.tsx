import React, { useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { HoleScene } from '../../components/hole/HoleScene';
import { useTheme } from '../../lib/theme';
import { buildHolePath, clamp, pointAtDistance } from '../../lib/holePath';
import { CAMERA_ZOOM, SCENE, WAYPOINTS } from '../../constants/hole';

export default function HoleScreen() {
  const { width, height } = useWindowDimensions();
  const { scheme } = useTheme();
  const path = useMemo(() => buildHolePath(WAYPOINTS), []);

  const s = (width / SCENE.width) * CAMERA_ZOOM;
  const tee = pointAtDistance(path, 0);
  const ballPos = useSharedValue(tee);
  const scale = useSharedValue(s);
  const tx = useSharedValue(clamp(width / 2 - tee.x * s, width - SCENE.width * s, 0));
  const ty = useSharedValue(clamp(height * 0.55 - tee.y * s, height - SCENE.height * s, 0));

  return (
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
  );
}
