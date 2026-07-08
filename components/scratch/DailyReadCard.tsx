import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { useHabits, useRecentLogs, useRelapses } from '../../lib/hooks/useHabits';
import { daysClean } from '../../lib/streaks';

// Project A: the read is composed locally from live data. Project B replaces
// the body with Scratch's agent-written brief.
export function DailyReadCard() {
  const { colors, spacing, radii, typography } = useTheme();
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useRecentLogs(1);
  const { data: relapses = [] } = useRelapses();

  const lines = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const doneIds = new Set(
      logs.filter((l) => l.log_date === today && l.status === 'done').map((l) => l.habit_id)
    );
    const remaining = habits.length - habits.filter((h) => doneIds.has(h.id)).length;
    const out: string[] = [];
    if (habits.length === 0) {
      out.push('No habits on the card yet — set up your first ones in Recovery.');
    } else if (remaining === 0) {
      out.push('Card is clean — everything checked off today. That is how rounds are won.');
    } else {
      out.push(`${remaining} thing${remaining === 1 ? '' : 's'} still open on today's card.`);
    }
    const recovery = habits.filter((h) => h.kind === 'recovery');
    const best = recovery
      .map((h) => ({ habit: h, days: daysClean(h, relapses) }))
      .sort((a, b) => b.days - a.days)[0];
    if (best && best.days > 0) {
      out.push(`${best.days} days clean on ${best.habit.name.toLowerCase()} — protect that streak.`);
    }
    return out;
  }, [habits, logs, relapses]);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginBottom: spacing.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
        <Ionicons name="reader-outline" size={16} color={colors.primary} />
        <Text style={[typography.label, { color: colors.primary }]}>THE DAILY READ</Text>
      </View>
      {lines.map((line) => (
        <Text key={line} style={[typography.body, { color: colors.text, marginBottom: spacing.xs }]}>
          {line}
        </Text>
      ))}
      <Text style={[typography.caption, { color: colors.textFaint, marginTop: spacing.xs }]}>
        Scratch&apos;s brain isn&apos;t connected yet — this is the quick read.
      </Text>
    </View>
  );
}
