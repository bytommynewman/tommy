import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { STOPS } from '../../constants/hole';
import { useHabits, useRecentLogs, useRelapses } from '../../lib/hooks/useHabits';
import { daysClean } from '../../lib/streaks';

// One badge card per section — the "overview below the AI" the spec requires.
// STOPS is the canonical section list (icon/label/route/tagline), shared with
// the course page so the two stay in sync.
export function SectionOverviewGrid() {
  const { colors, spacing, radii, typography } = useTheme();
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useRecentLogs(1);
  const { data: relapses = [] } = useRelapses();

  const recoveryStat = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const doneCount = logs.filter((l) => l.log_date === today && l.status === 'done').length;
    const recovery = habits.filter((h) => h.kind === 'recovery');
    const best = recovery.map((h) => daysClean(h, relapses)).sort((a, b) => b - a)[0];
    if (habits.length === 0) return null;
    const streak = best !== undefined && best > 0 ? `${best} days clean · ` : '';
    return `${streak}${doneCount}/${habits.length} done today`;
  }, [habits, logs, relapses]);

  return (
    <View>
      <Text style={[typography.label, { color: colors.textFaint, marginBottom: spacing.sm }]}>
        ON THE COURSE
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {STOPS.map((stop) => (
          <Pressable
            key={stop.label}
            onPress={() => router.push(stop.route)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${stop.label}`}
            style={{
              width: '48%',
              flexGrow: 1,
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: colors.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.sm,
              }}
            >
              <Ionicons name={stop.icon} size={17} color={colors.primary} />
            </View>
            <Text style={[typography.heading, { color: colors.text }]}>{stop.label}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={2}>
              {stop.label === 'Recovery' && recoveryStat ? recoveryStat : stop.tagline}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
