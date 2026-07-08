import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Header } from '../../components/ui/Header';
import { useTheme } from '../../lib/theme';
import { useHabits, useRecentLogs, useRelapses, useUpsertLog } from '../../lib/hooks/useHabits';
import { useProfile } from '../../lib/hooks/useProfile';
import { daysClean } from '../../lib/streaks';
import type { Habit } from '../../types/database.types';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Late night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function TodayHabitRow({ habit, done, onToggle }: { habit: Habit; done: boolean; onToggle: () => void }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        gap: spacing.md,
      }}
    >
      <Ionicons
        name={done ? 'checkmark-circle' : 'ellipse-outline'}
        size={26}
        color={done ? colors.success : colors.textFaint}
      />
      <Text
        style={[
          typography.body,
          {
            color: done ? colors.textMuted : colors.text,
            textDecorationLine: done ? 'line-through' : 'none',
            flex: 1,
          },
        ]}
      >
        {habit.kind === 'recovery' ? `Stay on track — ${habit.name.toLowerCase()}` : habit.name}
      </Text>
    </Pressable>
  );
}

export default function TodayScreen() {
  const { colors, typography, spacing } = useTheme();
  const { data: profile } = useProfile();
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useRecentLogs(1);
  const { data: relapses = [] } = useRelapses();
  const upsertLog = useUpsertLog();

  const today = format(new Date(), 'yyyy-MM-dd');
  const doneIds = new Set(logs.filter((l) => l.log_date === today && l.status === 'done').map((l) => l.habit_id));
  const remaining = habits.filter((h) => !doneIds.has(h.id));
  const firstName = profile?.display_name?.split(' ')[0] ?? 'Tommy';

  const recoveryHabits = habits.filter((h) => h.kind === 'recovery');
  const bestClean = recoveryHabits
    .map((h) => ({ habit: h, days: daysClean(h, relapses) }))
    .sort((a, b) => b.days - a.days)[0];

  const briefLines: string[] = [];
  if (habits.length === 0) {
    briefLines.push('Set up your first habits in Recovery — that unlocks your daily checklist here.');
  } else if (remaining.length === 0) {
    briefLines.push('Everything checked off. Days like this are the whole plan.');
  } else {
    briefLines.push(
      `${remaining.length} thing${remaining.length === 1 ? '' : 's'} left today. Small reps, big year.`
    );
  }
  if (bestClean && bestClean.days > 0) {
    briefLines.push(`${bestClean.days} days clean on ${bestClean.habit.name.toLowerCase()} — protect the streak.`);
  }

  return (
    <Screen scroll safeTop>
      <Header
        kicker={format(new Date(), 'EEEE, MMMM d')}
        title={`${greeting()}, ${firstName}`}
      />

      <Card tone="primary" style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary }]}>Your brief</Text>
        </View>
        {briefLines.map((line) => (
          <Text key={line} style={[typography.body, { color: colors.text, marginBottom: spacing.xs }]}>
            {line}
          </Text>
        ))}
      </Card>

      {habits.length > 0 ? (
        <Card style={{ marginBottom: spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.xs,
            }}
          >
            <Text style={[typography.label, { color: colors.textFaint }]}>Today&apos;s checklist</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {doneIds.size}/{habits.length}
            </Text>
          </View>
          {habits.map((habit) => (
            <TodayHabitRow
              key={habit.id}
              habit={habit}
              done={doneIds.has(habit.id)}
              onToggle={() =>
                upsertLog.mutate({
                  habit_id: habit.id,
                  log_date: today,
                  status: doneIds.has(habit.id) ? 'skipped' : 'done',
                })
              }
            />
          ))}
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Pressable style={{ flex: 1 }} onPress={() => router.push('/recovery')}>
          <Card style={{ alignItems: 'center', paddingVertical: spacing.md }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.text, marginTop: spacing.xs, fontWeight: '600' }]}>
              Recovery
            </Text>
          </Card>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => router.push('/reflect/journal')}>
          <Card style={{ alignItems: 'center', paddingVertical: spacing.md }}>
            <Ionicons name="book-outline" size={20} color={colors.accent} />
            <Text style={[typography.caption, { color: colors.text, marginTop: spacing.xs, fontWeight: '600' }]}>
              Journal
            </Text>
          </Card>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => router.push('/reflect/chat')}>
          <Card style={{ alignItems: 'center', paddingVertical: spacing.md }}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.calm} />
            <Text style={[typography.caption, { color: colors.text, marginTop: spacing.xs, fontWeight: '600' }]}>
              Talk
            </Text>
          </Card>
        </Pressable>
      </View>

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={[typography.label, { color: colors.textFaint, marginBottom: spacing.xs }]}>Up next</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Calendar events, goals progress, and an AI-written morning brief land here as we build out the
          next milestones.
        </Text>
      </Card>
    </Screen>
  );
}
