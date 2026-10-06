import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../components/ui/Screen';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { Chip } from '../../../components/quit/Chip';
import { ScaleRow } from '../../../components/quit/ScaleRow';
import { SectionLabel } from '../../../components/quit/SectionLabel';
import { useTheme } from '../../../lib/theme';
import {
  useActiveAttempt,
  useCopingTools,
  useCreateCraving,
  useIfThenPlans,
  useMarkToolUsed,
  useResolveCraving,
} from '../../../lib/hooks/useQuit';
import { useCreateRelapse } from '../../../lib/hooks/useHabits';
import { haltSuggestion } from '../../../lib/quitLogic';
import { CRAVING_TRIGGERS } from '../../../constants/quit';
import type { CopingTool, Craving, CravingOutcome } from '../../../types/database.types';

type Step = 'rate' | 'ride' | 'resolve';
const SURF_SECONDS = 10 * 60;

// The in-the-moment tool. Three screens, each one tap-heavy and type-light:
//  1. rate it + HALT + what's going on   → saves a craving row immediately
//  2. ride it: pick a tool, 10-minute timer, your reasons on screen
//  3. resolve: re-rate, passed / used / partial → updates the row
// If the answer is "used", a slip is also logged on the habit so the
// days-clean streak stays honest.
export default function CravingScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const { data: attempt } = useActiveAttempt();
  const { data: tools = [] } = useCopingTools();
  const { data: plans = [] } = useIfThenPlans();
  const createCraving = useCreateCraving();
  const resolveCraving = useResolveCraving();
  const markToolUsed = useMarkToolUsed();
  const createRelapse = useCreateRelapse();

  const [step, setStep] = useState<Step>('rate');
  const [intensity, setIntensity] = useState<number | null>(null);
  const [halt, setHalt] = useState({ hungry: false, angry: false, lonely: false, tired: false });
  const [tags, setTags] = useState<string[]>([]);
  const [context, setContext] = useState('');
  const [saved, setSaved] = useState<Craving | null>(null);
  const [tool, setTool] = useState<CopingTool | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SURF_SECONDS);
  const [running, setRunning] = useState(false);
  const [after, setAfter] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<CravingOutcome | null>(null);
  const [logSlip, setLogSlip] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const hint = haltSuggestion(halt);
  const matchingPlan = useMemo(() => {
    const lower = tags.join(' ').toLowerCase();
    if (!lower) return null;
    const byCategory: Record<string, string[]> = {
      night_out: ['pre-drinks', 'at the bar', 'drunk', 'friends smoking'],
      alcohol: ['pre-drinks', 'drunk'],
      sleep: ["can't sleep", 'late night alone'],
      food: ["can't eat"],
      ex: ['the ex'],
      nicotine: ['nicotine hit wanted'],
      mood: ['anxious', 'bad news'],
      social: ['friends smoking'],
    };
    for (const p of plans) {
      const words = byCategory[p.category] ?? [];
      if (words.some((w) => tags.includes(w))) return p;
    }
    return null;
  }, [tags, plans]);

  async function handleRate() {
    if (!attempt || intensity === null) return;
    setError(null);
    try {
      const row = await createCraving.mutateAsync({
        attempt_id: attempt.id,
        intensity,
        ...halt,
        trigger_tags: tags,
        context: context.trim() || null,
      });
      setSaved(row);
      startedAt.current = Date.now();
      setStep('ride');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function pickTool(t: CopingTool) {
    setTool(t);
    setSecondsLeft(Math.min(SURF_SECONDS, Math.max(180, t.minutes * 60)));
    setRunning(true);
  }

  async function handleResolve() {
    if (!saved || !outcome || !attempt) return;
    setError(null);
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    try {
      await resolveCraving.mutateAsync({
        id: saved.id,
        patch: {
          outcome,
          intensity_after: after,
          duration_minutes: minutes,
          ...(tool ? { coping_action: tool.name, coping_tool_id: tool.id } : {}),
        } as Parameters<typeof resolveCraving.mutateAsync>[0]['patch'],
      });
      if (tool) markToolUsed.mutate({ tool, helpful: outcome === 'passed' });
      if (outcome === 'used' && logSlip && attempt.habit_id) {
        await createRelapse.mutateAsync({
          habit_id: attempt.habit_id,
          trigger: context.trim() || null,
          trigger_tags: tags,
          severity: 2,
          support_used: !!tool,
          notes: `Logged from a craving (intensity ${saved.intensity}).`,
        });
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!attempt) {
    return (
      <Screen>
        <Text style={[typography.body, { color: colors.textMuted }]}>Start the quit first — then this button is the one you reach for.</Text>
        <View style={{ height: spacing.md }} />
        <Button label="Start the quit" onPress={() => router.replace('/recovery/quit-setup')} />
      </Screen>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  if (step === 'rate') {
    return (
      <Screen scroll>
        <Text style={[typography.heading, { color: colors.text }]}>Okay. Rate it.</Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.lg }]}>
          Cravings peak and fade in about 10–30 minutes whether or not you act on them. This is you timing one.
        </Text>

        <ScaleRow label="How strong, right now" low="nothing" high="brutal" value={intensity} onChange={setIntensity} />

        <SectionLabel>HALT check</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {(['hungry', 'angry', 'lonely', 'tired'] as const).map((k) => (
            <Chip key={k} label={k} selected={halt[k]} onPress={() => setHalt((h) => ({ ...h, [k]: !h[k] }))} />
          ))}
        </View>
        {hint ? (
          <Text style={[typography.caption, { color: colors.calm, marginTop: spacing.sm }]}>{hint}</Text>
        ) : null}

        <SectionLabel>What is going on</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {CRAVING_TRIGGERS.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={tags.includes(t)}
              onPress={() => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
            />
          ))}
        </View>
        <View style={{ height: spacing.md }} />
        <TextField value={context} onChangeText={setContext} placeholder="where / who / what (optional)" />

        {matchingPlan ? (
          <Card tone="accent" style={{ marginTop: spacing.md }}>
            <Text style={[typography.label, { color: colors.accent, marginBottom: 4 }]}>your plan for this</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>If {matchingPlan.situation.toLowerCase()}</Text>
            <Text style={[typography.caption, { color: colors.text }]}>→ {matchingPlan.response}</Text>
          </Card>
        ) : null}

        {error ? <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{error}</Text> : null}
        <View style={{ marginTop: spacing.lg }}>
          <Button label="Ride it out" onPress={handleRate} disabled={intensity === null} loading={createCraving.isPending} />
        </View>
      </Screen>
    );
  }

  if (step === 'ride') {
    return (
      <Screen scroll>
        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <Text style={[typography.label, { color: colors.textFaint }]}>{tool ? tool.name : 'pick something, then the clock starts'}</Text>
          <Text style={[typography.display, { color: tool ? colors.primary : colors.textFaint, fontSize: 56, marginTop: 4 }]}>
            {mm}:{ss}
          </Text>
          {tool ? (
            <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm }]}>
              {tool.instructions}
            </Text>
          ) : null}
        </View>

        {!tool ? (
          <>
            <SectionLabel>Do one of these</SectionLabel>
            <View style={{ gap: spacing.sm }}>
              {tools.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => pickTool(t)}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Ionicons name={iconFor(t.kind)} size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{t.name}</Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      {t.minutes} min · {t.kind}
                      {t.times_used > 0 ? ` · used ${t.times_used}×` : ''}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {attempt.reasons.length > 0 ? (
          <>
            <SectionLabel>Why you are doing this</SectionLabel>
            <Card>
              {attempt.reasons.map((r) => (
                <Text key={r} style={[typography.body, { color: colors.text, marginBottom: 4 }]}>
                  · {r}
                </Text>
              ))}
            </Card>
          </>
        ) : null}

        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <Button
            label={secondsLeft === 0 ? 'Time. How is it now?' : 'Re-rate it'}
            variant={secondsLeft === 0 ? 'primary' : 'secondary'}
            onPress={() => {
              setRunning(false);
              setStep('resolve');
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={[typography.heading, { color: colors.text }]}>And now?</Text>
      <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.lg }]}>
        Started at {saved?.intensity ?? '—'}. Honest answer only — the data is the point.
      </Text>

      <ScaleRow label="How strong, now" low="gone" high="same" value={after} onChange={setAfter} />

      <SectionLabel>What happened</SectionLabel>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(
          [
            { key: 'passed', label: 'it passed' },
            { key: 'partial', label: 'still here' },
            { key: 'used', label: 'I used' },
          ] as const
        ).map((o) => (
          <Chip
            key={o.key}
            label={o.label}
            selected={outcome === o.key}
            tone={o.key === 'used' ? 'danger' : 'default'}
            onPress={() => setOutcome(o.key)}
          />
        ))}
      </View>

      {outcome === 'used' ? (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={[typography.caption, { color: colors.text, marginBottom: spacing.sm }]}>
            A hit is a slip, not a verdict. Do not turn it into a night. Tomorrow is still a clean day and this
            check-in still counts.
          </Text>
          <Pressable onPress={() => setLogSlip((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name={logSlip ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.text }]}>Log it as a slip on the streak too</Text>
          </Pressable>
        </Card>
      ) : null}

      {outcome === 'partial' ? (
        <Text style={[typography.caption, { color: colors.calm, marginTop: spacing.md }]}>
          Still here is fine. Pick a second tool, or go to bed. It is already weaker than it was.
        </Text>
      ) : null}

      {error ? <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{error}</Text> : null}
      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        <Button label="Save" onPress={handleResolve} disabled={!outcome} loading={resolveCraving.isPending} />
        {outcome === 'partial' ? (
          <Button
            label="Another 10 minutes"
            variant="ghost"
            onPress={() => {
              setTool(null);
              setSecondsLeft(SURF_SECONDS);
              setStep('ride');
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}

function iconFor(kind: CopingTool['kind']): React.ComponentProps<typeof Ionicons>['name'] {
  switch (kind) {
    case 'move':
      return 'walk-outline';
    case 'body':
      return 'water-outline';
    case 'mind':
      return 'cloud-outline';
    case 'social':
      return 'chatbubble-ellipses-outline';
    case 'swap':
      return 'swap-horizontal-outline';
    case 'build':
      return 'hammer-outline';
    default:
      return 'ellipse-outline';
  }
}
