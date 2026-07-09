import React from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function SettingsScreen() {
  const { colors, typography, spacing } = useTheme();

  return (
    <Screen>
      <View style={{ gap: spacing.md }}>
        <Link href="/modal/profile" style={[typography.body, { color: colors.primary }]}>
          Edit profile
        </Link>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Reminder settings, PIN lock, and notification preferences arrive in M10.
        </Text>
        <Button label="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
        <Text style={[typography.caption, { color: colors.textFaint }]}>
          Hole imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community
        </Text>
      </View>
    </Screen>
  );
}
