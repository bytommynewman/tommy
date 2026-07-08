import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../components/ui/Screen';
import { TextField } from '../../../components/ui/TextField';
import { Button } from '../../../components/ui/Button';
import { useTheme } from '../../../lib/theme';
import { useCreateHabit } from '../../../lib/hooks/useHabits';
import type { HabitKind } from '../../../types/database.types';

const SUGGESTIONS: { name: string; kind: HabitKind; category: string }[] = [
  { name: 'Gym', kind: 'build', category: 'fitness' },
  { name: 'Sleep 8h', kind: 'build', category: 'sleep' },
  { name: 'Create content', kind: 'build', category: 'personal_brand' },
  { name: 'Gambling', kind: 'recovery', category: 'gambling' },
  { name: 'Weed', kind: 'recovery', category: 'substance' },
  { name: 'Nicotine', kind: 'recovery', category: 'substance' },
];

export default function NewHabitScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const createHabit = useCreateHabit();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<HabitKind>('build');
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(habitName: string, habitKind: HabitKind, category?: string) {
    setError(null);
    try {
      await createHabit.mutateAsync({ name: habitName, kind: habitKind, category });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Screen scroll>
      <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
        Quick add
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s.name}
            onPress={() => handleCreate(s.name, s.kind, s.category)}
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: radii.pill,
              backgroundColor: s.kind === 'recovery' ? colors.primaryMuted : colors.surfaceMuted,
            }}
          >
            <Text style={[typography.caption, { color: colors.text }]}>{s.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
        Or make your own
      </Text>
      <View style={{ gap: spacing.md }}>
        <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Read 20 min" />

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(
            [
              { key: 'build', label: 'Building up' },
              { key: 'recovery', label: 'Keeping in check' },
            ] as const
          ).map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setKind(option.key)}
              style={{
                flex: 1,
                padding: spacing.md,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: kind === option.key ? colors.primary : colors.border,
                backgroundColor: kind === option.key ? colors.primaryMuted : colors.surface,
                alignItems: 'center',
              }}
            >
              <Text style={[typography.caption, { color: colors.text }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        <Button
          label="Add habit"
          onPress={() => handleCreate(name.trim(), kind)}
          disabled={!name.trim()}
          loading={createHabit.isPending}
        />
      </View>
    </Screen>
  );
}
