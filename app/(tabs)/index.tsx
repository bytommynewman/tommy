import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { HoleScene } from '../../components/hole/HoleScene';
import { useHoleDrag } from '../../components/hole/useHoleDrag';
import { useTheme } from '../../lib/theme';

export default function HoleScreen() {
  const { width, height } = useWindowDimensions();
  const { scheme } = useTheme();
  const { path, ballPos, tx, ty, scale, gesture } = useHoleDrag(width, height);

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
    </View>
  );
}
