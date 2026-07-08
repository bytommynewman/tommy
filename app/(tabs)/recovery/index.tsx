import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../components/ui/Screen';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useTheme } from '../../../lib/theme';
import { useHabits, useRecentLogs, useRelapses, useUpsertLog } from '../../../lib/hooks/useHabits';
import { buildStreak, daysClean } from '../../../lib/streaks';
import type { Habit } from '../../../types/database.types';

function CleanStatCard({ habit, days }: { habit: Habit; days: number }) {
  const { colors, spacing, typography, radii } = useTheme();
  return (
    <Card tone="primary" style={{ width: 148, marginRight: spacing.sm, paddingVertical: spacing.lg }}>
      <Text style={[typography.stat, { color: colors.primary }]}>{days}</Text>
      <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>
        days clean
      </Text>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{habit.name}</Text>
    </Card>
  );
}

function BuildHabitRow({ habit }: { habit: Habit }) {
  const { colors, spacing, typography, radii } = useTheme();
  const { data: logs = [] } = useRecentLogs();
  const upsertLog = useUpsertLog();

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLog = logs.find((l) => l.habit_id === habit.id && l.log_date === today);
  const isDone = todayLog?.status === 'done';
  const streak = buildStreak(habit, logs);

  return (
    <Card style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{habit.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Ionicons name="flame" size={13} color={streak > 0 ? colors.accent : colors.textFaint} />
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {streak} day streak
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() =>
            upsertLog.mutate({
              habit_id: habit.id,
              log_date: today,
              status: isDone ? 'skipped' : 'done',
            })
          }
          hitSlop={8}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDone ? colors.primaryMuted : colors.surfaceMuted,
          }}
        >
          <Ionicons
            name={isDone ? 'checkmark' : 'add'}
            size={22}
            color={isDone ? colors.primary : colors.textMuted}
          />
        </Pressable>
      </View>
    </Card>
  );
}

export default function RecoveryScreen() {
  const { colors, spacing, typography } = useTheme();
  const { data: habits, isLoading, error } = useHabits();
  const { data: relapses = [] } = useRelapses();

  if (isLoading) {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Text style={{ color: colors.danger }}>Couldn&apos;t load habits: {String(error)}</Text>
      </Screen>
    );
  }

  const recovery = (habits ?? []).filter((h) => h.kind === 'recovery');
  const build = (habits ?? []).filter((h) => h.kind === 'build');

  return (
    <Screen scroll padded={false}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
        {(habits ?? []).length === 0 ? (
          <Card style={{ marginBottom: spacing.md }}>
            <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.sm }]}>
              Start here
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md }]}>
              Add the things you&apos;re building (gym, sleep) and the things you&apos;re keeping in check
              (gambling, weed, nicotine). Checking in daily — especially on the hard days — is what
              makes the patterns visible.
            </Text>
          </Card>
        ) : null}

        {recovery.length > 0 ? (
          <>
            <Text style={[typography.label, { color: colors.textFaint, marginBottom: spacing.sm }]}>
              Keeping in check
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: spacing.lg, marginHorizontal: -spacing.lg }}
              contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            >
              {recovery.map((habit) => (
                <CleanStatCard key={habit.id} habit={habit} days={daysClean(habit, relapses)} />
              ))}
            </ScrollView>
          </>
        ) : null}

        {build.length > 0 ? (
          <>
            <Text style={[typography.label, { color: colors.textFaint, marginBottom: spacing.sm }]}>
              Building
            </Text>
            {build.map((habit) => (
              <BuildHabitRow key={habit.id} habit={habit} />
            ))}
          </>
        ) : null}

        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          <Button label="Add a habit" variant="secondary" onPress={() => router.push('/recovery/new-habit')} />
          {recovery.length > 0 ? (
            <Button label="Log a slip" variant="ghost" onPress={() => router.push('/recovery/relapse')} />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
