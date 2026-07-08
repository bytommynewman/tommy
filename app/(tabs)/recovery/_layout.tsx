import { Stack } from 'expo-router';
import { useTheme } from '../../../lib/theme';

export default function RecoveryLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Recovery' }} />
      <Stack.Screen name="new-habit" options={{ title: 'New habit', presentation: 'modal' }} />
      <Stack.Screen name="relapse" options={{ title: 'Log a slip', presentation: 'modal' }} />
    </Stack>
  );
}
