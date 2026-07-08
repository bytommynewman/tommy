import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../lib/theme';
import { useProfile, useUpdateProfile } from '../../lib/hooks/useProfile';

export default function ProfileScreen() {
  const { colors, typography, spacing } = useTheme();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState('');
  const [contextSummary, setContextSummary] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setContextSummary(profile.context_summary ?? '');
    }
  }, [profile]);

  async function handleSave() {
    setError(null);
    try {
      await updateProfile.mutateAsync({ display_name: displayName, context_summary: contextSummary });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (isLoading) {
    return (
      <Screen>
        <Text style={{ color: colors.textMuted }}>Loading...</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ gap: spacing.md }}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          This context is fed into every therapist-mode chat so it stays grounded in who you actually are.
        </Text>
        <TextField label="Display name" value={displayName} onChangeText={setDisplayName} />
        <TextField
          label="Context summary"
          value={contextSummary}
          onChangeText={setContextSummary}
          multiline
          numberOfLines={8}
          style={{ minHeight: 160, textAlignVertical: 'top' }}
          placeholder="Goals, recovery status, how you want to be coached..."
        />
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        <Button label="Save" onPress={handleSave} loading={updateProfile.isPending} />
      </View>
    </Screen>
  );
}
