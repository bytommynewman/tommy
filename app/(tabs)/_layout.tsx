import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../lib/theme';

// The "(tabs)" group name is historical — it's now a stack shell over the
// golf-hole home screen; keeping the folder name avoids churning every route.
export default function HomeShellLayout() {
  const { colors } = useTheme();

  const section = {
    headerShown: false,
    presentation: 'modal' as const, // iOS: swipe-down to dismiss; Android: back gesture/button
    contentStyle: { backgroundColor: colors.background },
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="course" />
      <Stack.Screen name="recovery" options={section} />
      <Stack.Screen name="reflect" options={section} />
      <Stack.Screen name="plan" options={section} />
      <Stack.Screen name="life" options={section} />
      <Stack.Screen name="invest" options={section} />
    </Stack>
  );
}
