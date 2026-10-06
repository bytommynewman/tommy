import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useTheme } from '../../lib/theme';
import { useActiveAttempt, useCheckins, useMilestones } from '../../lib/hooks/useQuit';
import { hasCheckedInToday, isRiskWindow, nextMilestone, quitDayNumber } from '../../lib/quitLogic';
import { phaseForDay } from '../../constants/quit';

// Sits at the top of the Recovery screen. Two states: no quit started yet
// (one CTA), or an active quit (day count, phase, the two actions that
// matter in the moment: craving now / daily check-in).
export function QuitHeroCard() {
  const { colors, spacing, typography, radii } = useTheme();
  const { data: attempt, isLoading } = useActiveAttempt();
  const { data: checkins = [] } = useCheckins(attempt?.id);
  const { data: milestones = [] } = useMilestones(attempt?.id);

  if (isLoading) return null;

  if (!attempt) {
    return (
      <Card tone="primary" style={{ marginBottom: spacing.lg }}>
        <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.xs }]}>Quit weed</Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md }]}>
          Day counter, craving tool, daily check-in, your own if-then plans and the people to text. Built for a
          cold-turkey quit off high-THC carts. Starts the moment you say so.
        </Text>
        <Button label="Start the quit" onPress={() => router.push('/recovery/quit-setup')} />
      </Card>
    );
  }

  const day = quitDayNumber(attempt);
  const phase = phaseForDay(day);
  const checkedIn = hasCheckedInToday(checkins);
  const next = nextMilestone(milestones, day);
  const risky = isRiskWindow();

  return (
    <Card tone="primary" style={{ marginBottom: spacing.lg }}>
      <Pressable onPress={() => router.push('/recovery/quit')} accessibilityRole="button" accessibilityLabel="Open the quit dashboard">
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={[typography.label, { color: colors.textFaint }]}>off weed</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={[typography.stat, { color: colors.primary }]}>{day}</Text>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{day === 1 ? 'day' : 'days'}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{phase.title}</Text>
            {next ? (
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                next: day {next.day_number} · {next.day_number - day}d
              </Text>
            ) : null}
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} style={{ marginTop: 4 }} />
          </View>
        </View>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>{phase.focus}</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        <Pressable
          onPress={() => router.push('/recovery/craving')}
          accessibilityRole="button"
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: spacing.md,
            borderRadius: radii.md,
            backgroundColor: risky ? colors.accent : colors.primary,
          }}
        >
          <Ionicons name="flash" size={16} color={colors.background} />
          <Text style={[typography.body, { color: colors.background, fontWeight: '700' }]}>Craving now</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/recovery/checkin')}
          accessibilityRole="button"
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: spacing.md,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: checkedIn ? colors.border : colors.primary,
            backgroundColor: colors.surface,
          }}
        >
          <Ionicons name={checkedIn ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={checkedIn ? colors.success : colors.primary} />
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{checkedIn ? 'Checked in' : 'Check in'}</Text>
        </Pressable>
      </View>
    </Card>
  );
}
