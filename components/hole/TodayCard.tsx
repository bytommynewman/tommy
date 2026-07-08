import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { useHabits, useRecentLogs, useRelapses, useUpsertLog } from '../../lib/hooks/useHabits';
import { useProfile } from '../../lib/hooks/useProfile';
import { daysClean } from '../../lib/streaks';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Late night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TodayCard() {
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);

  const { data: profile } = useProfile();
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useRecentLogs(1);
  const { data: relapses = [] } = useRelapses();
  const upsertLog = useUpsertLog();

  const today = format(new Date(), 'yyyy-MM-dd');
  const doneIds = new Set(
    logs.filter((l) => l.log_date === today && l.status === 'done').map((l) => l.habit_id)
  );
  const remaining = habits.filter((h) => !doneIds.has(h.id));
  const firstName = profile?.display_name?.split(' ')[0] ?? 'Tommy';

  const recoveryHabits = habits.filter((h) => h.kind === 'recovery');
  const bestClean = recoveryHabits
    .map((h) => ({ habit: h, days: daysClean(h, relapses) }))
    .sort((a, b) => b.days - a.days)[0];

  const summary =
    habits.length === 0
      ? 'Set up habits in Recovery'
      : remaining.length === 0
        ? 'All done today'
        : `${remaining.length} left today`;

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + spacing.sm,
        left: spacing.lg,
        right: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse today summary' : 'Expand today summary'}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          gap: spacing.sm,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[typography.heading, { color: colors.text }]}>
            {greeting()}, {firstName}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{summary}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textFaint}
        />
      </Pressable>

      {expanded ? (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          {bestClean && bestClean.days > 0 ? (
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
              {bestClean.days} days clean on {bestClean.habit.name.toLowerCase()} — protect the streak.
            </Text>
          ) : null}
          {habits.map((habit) => {
            const done = doneIds.has(habit.id);
            return (
              <Pressable
                key={habit.id}
                onPress={() =>
                  upsertLog.mutate({
                    habit_id: habit.id,
                    log_date: today,
                    status: done ? 'skipped' : 'done',
                  })
                }
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.xs + 2,
                  gap: spacing.sm,
                }}
              >
                <Ionicons
                  name={done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={done ? colors.success : colors.textFaint}
                />
                <Text
                  style={[
                    typography.caption,
                    {
                      color: done ? colors.textMuted : colors.text,
                      textDecorationLine: done ? 'line-through' : 'none',
                      flex: 1,
                    },
                  ]}
                >
                  {habit.kind === 'recovery'
                    ? `Stay on track — ${habit.name.toLowerCase()}`
                    : habit.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
