import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { HUD_COLORS, HUD_RADIUS } from '../../constants/hud';

// HUD panel: hairline teal border over deep-green panel fill. `glow` adds a
// soft mint edge via shadow — iOS-only by design (Expo Go target is iPhone);
// Android quietly renders the plain border.
export function GlowBox({
  children,
  glow = false,
  style,
}: {
  children: React.ReactNode;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: HUD_COLORS.panel,
          borderWidth: 0.75,
          borderColor: glow ? HUD_COLORS.lineBright : HUD_COLORS.line,
          borderRadius: HUD_RADIUS,
        },
        glow && {
          shadowColor: HUD_COLORS.mint,
          shadowOpacity: 0.45,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
