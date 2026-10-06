import { Pressable } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
      <Stack.Screen
        name="index"
        options={{
          title: 'Recovery',
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back to the course"
            >
              <Ionicons name="chevron-down" size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="new-habit" options={{ title: 'New habit', presentation: 'modal' }} />
      <Stack.Screen name="relapse" options={{ title: 'Log a slip', presentation: 'modal' }} />
      <Stack.Screen name="quit" options={{ title: 'Off weed' }} />
      <Stack.Screen name="quit-setup" options={{ title: 'Start the quit', presentation: 'modal' }} />
      <Stack.Screen name="craving" options={{ title: 'Craving', presentation: 'modal' }} />
      <Stack.Screen name="checkin" options={{ title: 'Daily check-in', presentation: 'modal' }} />
    </Stack>
  );
}
