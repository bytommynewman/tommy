import React from 'react';
import { Stack } from 'expo-router';
import { HUD_COLORS } from '../../../constants/hud';

export default function ContentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: HUD_COLORS.bg },
      }}
    />
  );
}
