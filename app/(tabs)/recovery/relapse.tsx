import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../components/ui/Screen';
import { TextField } from '../../../components/ui/TextField';
import { Button } from '../../../components/ui/Button';
import { useTheme } from '../../../lib/theme';
import { useCreateRelapse, useHabits } from '../../../lib/hooks/useHabits';

const TRIGGER_TAGS = ['stress', 'boredom', 'loneliness', 'social', 'payday', 'late night', 'anxiety', 'celebration'];

export default function RelapseScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const { data: habits = [] } = useHabits();
  const createRelapse = useCreateRelapse();

  const recoveryHabits = habits.filter((h) => h.kind === 'recovery');
  const [habitId, setHabitId] = useState<string | null>(recoveryHabits[0]?.id ?? null);
  const [trigger, setTrigger] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [severity, setSeverity] = useState<number | null>(null);
  const [supportUsed, setSupportUsed] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedHabit = recoveryHabits.find((h) => h.id === habitId);
  const isGambling = selectedHabit?.category === 'gambling';

  function toggleTag(tag: string) {
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));
  }

  async function handleSave() {
    if (!habitId) return;
    setError(null);
    try {
      await createRelapse.mutateAsync({
        habit_id: habitId,
        trigger: trigger.trim() || null,
        trigger_tags: tags,
        amount: amount ? Number(amount) : null,
        severity,
        support_used: supportUsed,
        notes: notes.trim() || null,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Screen scroll>
      <Text style={[typography.caption, { color: colors.calm, marginBottom: spacing.lg }]}>
        Logging this is the strong move, not the weak one. The details you write down now are exactly
        what makes the next one easier to see coming.
      </Text>

      <View style={{ gap: spacing.md }}>
        <View>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>What happened?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {recoveryHabits.map((habit) => (
              <Pressable
                key={habit.id}
                onPress={() => setHabitId(habit.id)}
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: habitId === habit.id ? colors.primary : colors.border,
                  backgroundColor: habitId === habit.id ? colors.primaryMuted : colors.surface,
                }}
              >
                <Text style={[typography.caption, { color: colors.text }]}>{habit.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
            What was going on right before? (tap any that fit)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {TRIGGER_TAGS.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: radii.pill,
                  backgroundColor: tags.includes(tag) ? colors.primaryMuted : colors.surfaceMuted,
                }}
              >
                <Text style={[typography.caption, { color: colors.text }]}>{tag}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <TextField
          label="In your own words (optional)"
          value={trigger}
          onChangeText={setTrigger}
          placeholder="What led up to it?"
        />

        {isGambling ? (
          <TextField
            label="Amount ($)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        ) : null}

        <View>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
            How bad did it feel? (1 = blip, 5 = rough)
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setSeverity(n)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radii.md,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: severity === n ? colors.primary : colors.border,
                  backgroundColor: severity === n ? colors.primaryMuted : colors.surface,
                }}
              >
                <Text style={{ color: colors.text }}>{n}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => setSupportUsed((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: supportUsed ? colors.primary : colors.border,
              backgroundColor: supportUsed ? colors.primary : colors.surface,
            }}
          />
          <Text style={[typography.caption, { color: colors.text }]}>
            I reached out to someone or used a coping strategy
          </Text>
        </Pressable>

        <TextField
          label="Anything else worth remembering? (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          style={{ minHeight: 88, textAlignVertical: 'top' }}
        />

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        <Button
          label="Save"
          onPress={handleSave}
          disabled={!habitId}
          loading={createRelapse.isPending}
        />
      </View>
    </Screen>
  );
}
