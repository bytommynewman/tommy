import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { subHours } from 'date-fns';
import { Screen } from '../../../components/ui/Screen';
import { TextField } from '../../../components/ui/TextField';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/quit/Chip';
import { SectionLabel } from '../../../components/quit/SectionLabel';
import { useTheme } from '../../../lib/theme';
import { useStartQuit } from '../../../lib/hooks/useQuit';
import { DEFAULT_WEEKLY_COST_CENTS } from '../../../constants/quit';

// When was the last hit? Anchors day 0 honestly instead of "now".
const LAST_HIT_OPTIONS: { key: string; label: string; hoursAgo: number }[] = [
  { key: 'now', label: 'just now', hoursAgo: 0 },
  { key: 'few', label: 'a few hours ago', hoursAgo: 4 },
  { key: 'lastnight', label: 'last night', hoursAgo: 14 },
  { key: 'yesterday', label: 'yesterday', hoursAgo: 28 },
  { key: 'twodays', label: '2 days ago', hoursAgo: 48 },
];

// Reasons in Tommy's own words. These get read back during a craving.
const REASON_SUGGESTIONS = [
  'appetite back',
  'actually sleep',
  'energy for the gym',
  'the white tongue and the taste',
  'stop feeling depleted',
  'clear head for last year',
  'holdr deserves a sharp founder',
  'parents stop worrying',
  'not need something to feel okay',
  'my brain has taken enough hits',
];

export default function QuitSetupScreen() {
  const { colors, spacing, typography } = useTheme();
  const startQuit = useStartQuit();
  const [lastHit, setLastHit] = useState('now');
  const [baseline, setBaseline] = useState('1 g live resin indica cart every ~72 h, sometimes 48 h');
  const [weeklyCost, setWeeklyCost] = useState(String(Math.round(DEFAULT_WEEKLY_COST_CENTS / 100)));
  const [reasons, setReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggleReason = (r: string) =>
    setReasons((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const addCustom = () => {
    const r = customReason.trim();
    if (!r) return;
    if (!reasons.includes(r)) setReasons((cur) => [...cur, r]);
    setCustomReason('');
  };

  async function handleStart() {
    setError(null);
    const hours = LAST_HIT_OPTIONS.find((o) => o.key === lastHit)?.hoursAgo ?? 0;
    const cost = Math.max(0, Math.round(Number(weeklyCost.replace(/[^0-9.]/g, '')) * 100) || 0);
    try {
      await startQuit.mutateAsync({
        started_at: subHours(new Date(), hours).toISOString(),
        baseline_use: baseline.trim(),
        baseline_cost_cents_per_week: cost,
        reasons: customReason.trim() && !reasons.includes(customReason.trim()) ? [...reasons, customReason.trim()] : reasons,
      });
      router.replace('/recovery/quit');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Screen scroll>
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        Two minutes. This sets up the counter, your toolkit, the if-then plans, your milestones and the people to
        text. You can edit all of it later.
      </Text>

      <SectionLabel>Last hit</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {LAST_HIT_OPTIONS.map((o) => (
          <Chip key={o.key} label={o.label} selected={lastHit === o.key} onPress={() => setLastHit(o.key)} />
        ))}
      </View>

      <SectionLabel>What it looked like</SectionLabel>
      <TextField value={baseline} onChangeText={setBaseline} multiline style={{ minHeight: 60, textAlignVertical: 'top' }} />
      <View style={{ height: spacing.sm }} />
      <TextField
        label="What it cost per week ($)"
        value={weeklyCost}
        onChangeText={setWeeklyCost}
        keyboardType="decimal-pad"
        placeholder="e.g. 115"
      />

      <SectionLabel>Why (pick what is true, add your own)</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
        {REASON_SUGGESTIONS.map((r) => (
          <Chip key={r} label={r} selected={reasons.includes(r)} onPress={() => toggleReason(r)} />
        ))}
        {reasons
          .filter((r) => !REASON_SUGGESTIONS.includes(r))
          .map((r) => (
            <Chip key={r} label={r} selected onPress={() => toggleReason(r)} />
          ))}
      </View>
      <TextField
        value={customReason}
        onChangeText={setCustomReason}
        placeholder="in your own words…"
        onSubmitEditing={addCustom}
        returnKeyType="done"
      />

      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.textFaint }]}>
          Before you tap: the cart and the battery leave the house today. Not hidden. Gone.
        </Text>
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        <Button label="Start · day 0" onPress={handleStart} loading={startQuit.isPending} />
      </View>
    </Screen>
  );
}
