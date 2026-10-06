import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../components/ui/Screen';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { Chip } from '../../../components/quit/Chip';
import { ScaleRow } from '../../../components/quit/ScaleRow';
import { Stepper } from '../../../components/quit/Stepper';
import { SectionLabel } from '../../../components/quit/SectionLabel';
import { useTheme } from '../../../lib/theme';
import { useActiveAttempt, useCheckins, useUpsertCheckin } from '../../../lib/hooks/useQuit';
import { useCreateRelapse, useRelapses } from '../../../lib/hooks/useHabits';
import { quitDayNumber, todayKey } from '../../../lib/quitLogic';
import {
  CHECKIN_BEHAVIOURS,
  CHECKIN_FLAGS,
  CHECKIN_SCALES,
  CWS_INTERFERENCE_TEXT,
  CWS_ITEMS,
  NICOTINE_LEVELS,
  phaseForDay,
  type CheckinBehaviourKey,
  type CheckinFlagKey,
  type CheckinScaleKey,
} from '../../../constants/quit';

// The daily check-in. Built to be done in under a minute, in the evening:
// seven 0–10 taps, a few toggles, two counters, one line. The full 19-item
// Cannabis Withdrawal Scale is behind a disclosure for the days (or the
// weekly habit) when the extra detail is worth it.
export default function CheckinScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const { data: attempt } = useActiveAttempt();
  const { data: checkins = [] } = useCheckins(attempt?.id);
  const { data: relapses = [] } = useRelapses();
  const upsert = useUpsertCheckin();
  const createRelapse = useCreateRelapse();

  const today = todayKey();
  const existing = useMemo(() => checkins.find((c) => c.checkin_date === today) ?? null, [checkins, today]);

  const [scales, setScales] = useState<Partial<Record<CheckinScaleKey, number | null>>>(() =>
    Object.fromEntries(CHECKIN_SCALES.map((s) => [s.key, existing?.[s.key] ?? null]))
  );
  const [flags, setFlags] = useState<Record<CheckinFlagKey, boolean>>({
    vivid_dreams: existing?.vivid_dreams ?? false,
    night_sweats: existing?.night_sweats ?? false,
    headache: existing?.headache ?? false,
    nausea: existing?.nausea ?? false,
  });
  const [behaviours, setBehaviours] = useState<Record<CheckinBehaviourKey, boolean>>({
    ate_breakfast: existing?.ate_breakfast ?? false,
    worked_out: existing?.worked_out ?? false,
    got_outside: existing?.got_outside ?? false,
  });
  const [sleepHours, setSleepHours] = useState<number | null>(existing?.sleep_hours ?? null);
  const [meals, setMeals] = useState<number | null>(existing?.meals_count ?? null);
  const [drinks, setDrinks] = useState<number | null>(existing?.drinks_count ?? null);
  const [nicotine, setNicotine] = useState<number | null>(existing?.nicotine_level ?? null);
  const [used, setUsed] = useState<boolean>(existing?.used_cannabis ?? false);
  const [win, setWin] = useState(existing?.win ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [showCws, setShowCws] = useState(false);
  const [cws, setCws] = useState<Record<string, number>>(existing?.cws_items ?? {});
  const [interference, setInterference] = useState<number | null>(existing?.cws_interference ?? null);
  const [error, setError] = useState<string | null>(null);

  if (!attempt) {
    return (
      <Screen>
        <Text style={[typography.body, { color: colors.textMuted }]}>Start the quit first.</Text>
        <View style={{ height: spacing.md }} />
        <Button label="Start the quit" onPress={() => router.replace('/recovery/quit-setup')} />
      </Screen>
    );
  }

  const day = quitDayNumber(attempt);
  const phase = phaseForDay(day);

  async function handleSave() {
    if (!attempt) return;
    setError(null);
    try {
      await upsert.mutateAsync({
        attempt_id: attempt.id,
        checkin_date: today,
        sleep_hours: sleepHours,
        ...scales,
        ...flags,
        ...behaviours,
        meals_count: meals,
        drinks_count: drinks,
        nicotine_level: nicotine,
        used_cannabis: used,
        cws_items: Object.keys(cws).length > 0 ? cws : null,
        cws_interference: interference,
        win: win.trim() || null,
        notes: notes.trim() || null,
      });
      // Keep the streak honest: an admitted use with no slip logged today
      // creates one, so days-clean and the check-in agree.
      const slippedToday = relapses.some(
        (r) => r.habit_id === attempt.habit_id && r.occurred_at.slice(0, 10) === today
      );
      if (used && !slippedToday && attempt.habit_id) {
        await createRelapse.mutateAsync({
          habit_id: attempt.habit_id,
          severity: 2,
          notes: 'Logged from the daily check-in.',
        });
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const toggle = <K extends string>(setter: React.Dispatch<React.SetStateAction<Record<K, boolean>>>, key: K) =>
    setter((cur) => ({ ...cur, [key]: !cur[key] }));

  return (
    <Screen scroll>
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        Day {day} · {phase.title}. {existing ? 'Editing today.' : 'Under a minute. Honest beats flattering.'}
      </Text>

      <SectionLabel>Today, 0–10</SectionLabel>
      <View style={{ gap: spacing.md }}>
        {CHECKIN_SCALES.map((s) => (
          <ScaleRow
            key={s.key}
            label={s.label}
            low={s.low}
            high={s.high}
            value={scales[s.key] ?? null}
            onChange={(v) => setScales((cur) => ({ ...cur, [s.key]: v }))}
          />
        ))}
      </View>

      <SectionLabel>Body</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {CHECKIN_FLAGS.map((f) => (
          <Chip key={f.key} label={f.label} selected={flags[f.key]} onPress={() => toggle(setFlags, f.key)} />
        ))}
      </View>
      <View style={{ height: spacing.md }} />
      <Stepper label="Hours slept" value={sleepHours} onChange={setSleepHours} max={14} suffix="h" />
      <View style={{ height: spacing.sm }} />
      <Stepper label="Meals" value={meals} onChange={setMeals} max={8} />

      <SectionLabel>Did</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {CHECKIN_BEHAVIOURS.map((b) => (
          <Chip key={b.key} label={b.label} selected={behaviours[b.key]} onPress={() => toggle(setBehaviours, b.key)} />
        ))}
      </View>

      <SectionLabel>Substances</SectionLabel>
      <Pressable
        onPress={() => setUsed((v) => !v)}
        accessibilityRole="button"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: spacing.md,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: used ? colors.danger : colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Weed today</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[typography.caption, { color: used ? colors.danger : colors.success, fontWeight: '600' }]}>
            {used ? 'yes' : 'clean'}
          </Text>
          <Ionicons name={used ? 'close-circle' : 'checkmark-circle'} size={20} color={used ? colors.danger : colors.success} />
        </View>
      </Pressable>
      <View style={{ height: spacing.md }} />
      <Text style={[typography.caption, { color: colors.text, fontWeight: '600', marginBottom: spacing.xs }]}>Nicotine</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {NICOTINE_LEVELS.map((label, i) => (
          <Chip key={label} label={label} selected={nicotine === i} onPress={() => setNicotine(i)} />
        ))}
      </View>
      <View style={{ height: spacing.md }} />
      <Stepper label="Drinks" value={drinks} onChange={setDrinks} max={20} />

      <SectionLabel>One good thing</SectionLabel>
      <TextField value={win} onChangeText={setWin} placeholder="anything. ate breakfast counts." />
      <View style={{ height: spacing.sm }} />
      <TextField
        value={notes}
        onChangeText={setNotes}
        placeholder="notes (optional)"
        multiline
        style={{ minHeight: 60, textAlignVertical: 'top' }}
      />

      <Pressable
        onPress={() => setShowCws((v) => !v)}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg }}
      >
        <Ionicons name={showCws ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.textMuted} />
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Full withdrawal scale (19 items, ~2 min) — worth doing once a week
        </Text>
      </Pressable>
      {showCws ? (
        <Card style={{ marginTop: spacing.sm, gap: spacing.md }}>
          <Text style={[typography.caption, { color: colors.textFaint }]}>
            Past 24 hours. 0 = not at all, 5 = moderately, 10 = extremely. Cannabis Withdrawal Scale (Allsop et al. 2011).
          </Text>
          {CWS_ITEMS.map((item) => (
            <ScaleRow
              key={item.key}
              label={item.text}
              value={cws[item.key] ?? null}
              onChange={(v) => setCws((cur) => ({ ...cur, [item.key]: v }))}
            />
          ))}
          <ScaleRow label={CWS_INTERFERENCE_TEXT} value={interference} onChange={setInterference} />
        </Card>
      ) : null}

      {error ? <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{error}</Text> : null}
      <View style={{ marginTop: spacing.lg }}>
        <Button label={existing ? 'Update' : 'Save check-in'} onPress={handleSave} loading={upsert.isPending} />
      </View>
    </Screen>
  );
}
