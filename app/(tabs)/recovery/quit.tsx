import React, { useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../components/ui/Screen';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { Chip } from '../../../components/quit/Chip';
import { TrendBars } from '../../../components/quit/TrendBars';
import { SectionLabel } from '../../../components/quit/SectionLabel';
import { useTheme } from '../../../lib/theme';
import {
  useActiveAttempt,
  useCheckins,
  useCopingTools,
  useCravings,
  useCreateIfThenPlan,
  useIfThenPlans,
  useMilestones,
  useSupportContacts,
  useUpdateIfThenPlan,
  useUpdateMilestone,
  useUpdateSupportContact,
} from '../../../lib/hooks/useQuit';
import { useHabits, useRelapses } from '../../../lib/hooks/useHabits';
import { daysClean } from '../../../lib/streaks';
import {
  dailySeries,
  formatCad,
  formatHour,
  longestCleanRun,
  milestonesDue,
  moneySavedCents,
  quitDayNumber,
  summarizeCheckins,
  summarizeCravings,
} from '../../../lib/quitLogic';
import { phaseForDay, QUIT_PHASES } from '../../../constants/quit';
import type { IfThenCategory, QuitMilestone, SupportContact } from '../../../types/database.types';

const PLAN_CATEGORIES: IfThenCategory[] = ['general', 'night_out', 'home', 'sleep', 'food', 'social', 'mood', 'nicotine', 'alcohol', 'ex'];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Card style={{ flex: 1, minWidth: 140, paddingVertical: spacing.md }}>
      <Text style={[typography.label, { color: colors.textFaint }]}>{label}</Text>
      <Text style={[typography.title, { color: colors.text, marginTop: 2 }]}>{value}</Text>
      {sub ? <Text style={[typography.caption, { color: colors.textMuted }]}>{sub}</Text> : null}
    </Card>
  );
}

function MilestoneRow({ m, day, attemptId }: { m: QuitMilestone; day: number; attemptId: string }) {
  const { colors, spacing, typography, radii } = useTheme();
  const update = useUpdateMilestone(attemptId);
  const [editing, setEditing] = useState(false);
  const [reward, setReward] = useState(m.reward ?? '');
  const reached = !!m.reached_at;
  const due = m.day_number <= day && !reached;
  const upcoming = m.day_number > day;

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity: upcoming ? 0.85 : 1,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: reached ? colors.primary : due ? colors.accentMuted : colors.surfaceMuted,
        }}
      >
        <Text style={{ color: reached ? colors.onPrimary : colors.text, fontWeight: '700' }}>{m.day_number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{m.title}</Text>
        {m.what_to_expect ? <Text style={[typography.caption, { color: colors.textMuted }]}>{m.what_to_expect}</Text> : null}
        {editing ? (
          <View style={{ marginTop: spacing.xs, gap: spacing.xs }}>
            <TextField value={reward} onChangeText={setReward} placeholder="the reward, decided now" autoFocus />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Chip
                label="save"
                selected
                onPress={() => {
                  update.mutate({ id: m.id, patch: { reward: reward.trim() || null } });
                  setEditing(false);
                }}
              />
              <Chip label="cancel" onPress={() => setEditing(false)} />
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setEditing(true)} accessibilityRole="button" accessibilityLabel="Edit reward">
            <Text style={[typography.caption, { color: m.reward ? colors.accent : colors.textFaint, marginTop: 2 }]}>
              {m.reward ? `reward: ${m.reward}` : 'reward: tap to decide it now'}
            </Text>
          </Pressable>
        )}
        {due ? (
          <View style={{ marginTop: spacing.sm }}>
            <Chip
              label="reached clean · claim it"
              selected
              onPress={() => update.mutate({ id: m.id, patch: { reached_at: new Date().toISOString(), reward_claimed: true } })}
            />
          </View>
        ) : null}
        {reached && m.reward ? (
          <Text style={[typography.caption, { color: colors.success, marginTop: 2 }]}>
            {m.reward_claimed ? 'claimed' : 'reached — go claim it'}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ContactRow({ c }: { c: SupportContact }) {
  const { colors, spacing, typography } = useTheme();
  const update = useUpdateSupportContact();
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(c.phone ?? '');
  const canCall = !!c.phone;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ flex: 1 }}>
        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{c.name}</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {c.role.replace('_', ' ')}
          {c.late_night_ok ? ' · late ok' : ''}
          {c.knows === 'full' ? ' · knows' : c.knows === 'partial' ? ' · knows some' : ''}
        </Text>
        {c.notes ? <Text style={[typography.caption, { color: colors.textFaint }]}>{c.notes}</Text> : null}
        {editing ? (
          <View style={{ marginTop: spacing.xs, gap: spacing.xs }}>
            <TextField value={phone} onChangeText={setPhone} placeholder="phone" keyboardType="phone-pad" autoFocus />
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Chip
                label="save"
                selected
                onPress={() => {
                  update.mutate({ id: c.id, patch: { phone: phone.trim() || null } });
                  setEditing(false);
                }}
              />
              <Chip
                label={c.knows === 'full' ? 'mark: does not know' : 'mark: knows'}
                onPress={() => update.mutate({ id: c.id, patch: { knows: c.knows === 'full' ? 'none' : 'full' } })}
              />
              <Chip label="cancel" onPress={() => setEditing(false)} />
            </View>
          </View>
        ) : null}
      </View>
      {!editing ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {canCall && c.text_ok ? (
            <Pressable onPress={() => Linking.openURL(`sms:${c.phone}`)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Text ${c.name}`}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
            </Pressable>
          ) : null}
          {canCall ? (
            <Pressable onPress={() => Linking.openURL(`tel:${c.phone}`)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Call ${c.name}`}>
              <Ionicons name="call-outline" size={20} color={colors.primary} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => setEditing(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Edit ${c.name}`}>
            <Ionicons name="create-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function QuitDashboardScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const { data: attempt, isLoading } = useActiveAttempt();
  const { data: checkins = [] } = useCheckins(attempt?.id);
  const { data: cravings = [] } = useCravings(attempt?.id);
  const { data: milestones = [] } = useMilestones(attempt?.id);
  const { data: plans = [] } = useIfThenPlans();
  const { data: tools = [] } = useCopingTools();
  const { data: contacts = [] } = useSupportContacts();
  const { data: habits = [] } = useHabits();
  const { data: relapses = [] } = useRelapses();
  const createPlan = useCreateIfThenPlan();
  const updatePlan = useUpdateIfThenPlan();

  const [showAllPhases, setShowAllPhases] = useState(false);
  const [addingPlan, setAddingPlan] = useState(false);
  const [newSituation, setNewSituation] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [newCategory, setNewCategory] = useState<IfThenCategory>('general');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const day = attempt ? quitDayNumber(attempt) : 0;
  const phase = phaseForDay(day);
  const habit = habits.find((h) => h.id === attempt?.habit_id) ?? null;
  const streak = habit ? daysClean(habit, relapses) : day;
  const checkinSummary = useMemo(() => summarizeCheckins(checkins), [checkins]);
  const cravingStats = useMemo(() => summarizeCravings(cravings), [cravings]);
  const due = milestonesDue(milestones, day);
  const best = longestCleanRun(checkins);

  if (isLoading) return <Screen />;

  if (!attempt) {
    return (
      <Screen>
        <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.sm }]}>No quit running</Text>
        <Button label="Start the quit" onPress={() => router.replace('/recovery/quit-setup')} />
      </Screen>
    );
  }

  const moneySaved = moneySavedCents(attempt);

  return (
    <Screen scroll>
      {/* Headline */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Text style={[typography.label, { color: colors.textFaint }]}>current run</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={[typography.stat, { color: colors.primary }]}>{streak}</Text>
            <Text style={[typography.body, { color: colors.text }]}>{streak === 1 ? 'day' : 'days'} clean</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>since quit: day {day}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>best run: {Math.max(best, streak)}d</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        <Pressable
          onPress={() => router.push('/recovery/craving')}
          accessibilityRole="button"
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.primary }}
        >
          <Ionicons name="flash" size={16} color={colors.onPrimary} />
          <Text style={[typography.body, { color: colors.onPrimary, fontWeight: '700' }]}>Craving now</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/recovery/checkin')}
          accessibilityRole="button"
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface }}
        >
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Check in</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg }}>
        <Stat label="not spent" value={formatCad(moneySaved)} sub={`${formatCad(attempt.baseline_cost_cents_per_week)}/wk before`} />
        <Stat
          label="clean days"
          value={checkinSummary.cleanPercent === null ? '—' : `${checkinSummary.cleanPercent}%`}
          sub={`${checkinSummary.cleanDays}/${checkinSummary.daysLogged} logged`}
        />
        <Stat
          label="cravings beaten"
          value={cravingStats.passedPercent === null ? '—' : `${cravingStats.passedPercent}%`}
          sub={cravingStats.total ? `${cravingStats.passed} of ${cravingStats.total}` : 'none logged yet'}
        />
        <Stat
          label="avg craving"
          value={cravingStats.avgDurationMinutes === null ? '—' : `${Math.round(cravingStats.avgDurationMinutes)} min`}
          sub={cravingStats.avgDrop !== null ? `drops ${cravingStats.avgDrop} pts on avg` : 'time them to see'}
        />
      </View>

      {/* Phase */}
      <SectionLabel
        right={
          <Pressable onPress={() => setShowAllPhases((v) => !v)} hitSlop={8}>
            <Text style={[typography.caption, { color: colors.primary }]}>{showAllPhases ? 'just now' : 'whole map'}</Text>
          </Pressable>
        }
      >
        {`Where you are · ${phase.title}`}
      </SectionLabel>
      <Card tone="primary">
        <Text style={[typography.body, { color: colors.text }]}>{phase.expect}</Text>
        <Text style={[typography.caption, { color: colors.text, fontWeight: '600', marginTop: spacing.sm }]}>Focus: {phase.focus}</Text>
      </Card>
      {showAllPhases ? (
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          {QUIT_PHASES.filter((p) => p.key !== phase.key).map((p) => (
            <Card key={p.key}>
              <Text style={[typography.caption, { color: colors.textFaint, fontWeight: '700' }]}>
                {p.toDay === Infinity ? `day ${p.fromDay}+` : p.fromDay === p.toDay ? `day ${p.fromDay}` : `days ${p.fromDay}–${p.toDay}`} · {p.title}
              </Text>
              <Text style={[typography.caption, { color: colors.text, marginTop: 2 }]}>{p.expect}</Text>
            </Card>
          ))}
        </View>
      ) : null}

      {/* Due milestones */}
      {due.length > 0 ? (
        <Card tone="accent" style={{ marginTop: spacing.md }}>
          <Text style={[typography.label, { color: colors.accent, marginBottom: 4 }]}>milestone reached</Text>
          <Text style={[typography.body, { color: colors.text }]}>
            Day {due[0].day_number}: {due[0].title}. {due[0].reward ? `Reward: ${due[0].reward}.` : 'You never set the reward — set it, then claim it.'}
          </Text>
        </Card>
      ) : null}

      {/* Trends */}
      {checkins.length > 0 ? (
        <>
          <SectionLabel>Last 14 days</SectionLabel>
          <Card style={{ gap: spacing.md }}>
            <TrendBars label="mood" values={dailySeries(checkins, 'mood', 14)} good="up" />
            <TrendBars label="sleep" values={dailySeries(checkins, 'sleep_quality', 14)} good="up" />
            <TrendBars label="appetite" values={dailySeries(checkins, 'appetite', 14)} good="up" />
            <TrendBars label="anxiety" values={dailySeries(checkins, 'anxiety', 14)} good="down" />
            <TrendBars label="worst craving" values={dailySeries(checkins, 'craving_peak', 14)} good="down" />
            {Object.keys(checkinSummary.trend).length > 0 ? (
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                vs your first days:{' '}
                {(['mood', 'sleep_quality', 'appetite', 'anxiety', 'craving_peak'] as const)
                  .filter((k) => checkinSummary.trend[k] !== undefined)
                  .map((k) => `${k.replace('_quality', '').replace('_peak', '')} ${(checkinSummary.trend[k] ?? 0) > 0 ? '+' : ''}${checkinSummary.trend[k]}`)
                  .join(' · ')}
              </Text>
            ) : null}
          </Card>
        </>
      ) : null}

      {/* Craving insights */}
      {cravingStats.total > 0 ? (
        <>
          <SectionLabel>Your cravings</SectionLabel>
          <Card style={{ gap: spacing.xs }}>
            {cravingStats.peakHours.length > 0 ? (
              <Text style={[typography.caption, { color: colors.text }]}>
                Danger window: {cravingStats.peakHours.map(formatHour).join(', ')}
              </Text>
            ) : null}
            {cravingStats.topTriggers.length > 0 ? (
              <Text style={[typography.caption, { color: colors.text }]}>
                Top triggers: {cravingStats.topTriggers.map((t) => `${t.tag} (${t.count})`).join(', ')}
              </Text>
            ) : null}
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              HALT: hungry {cravingStats.haltCounts.hungry} · angry {cravingStats.haltCounts.angry} · lonely {cravingStats.haltCounts.lonely} · tired {cravingStats.haltCounts.tired}
            </Text>
          </Card>
        </>
      ) : null}

      {/* Milestones */}
      <SectionLabel>Milestones & rewards</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        {milestones.map((m) => (
          <MilestoneRow key={m.id} m={m} day={day} attemptId={attempt.id} />
        ))}
      </Card>

      {/* If-then plans */}
      <SectionLabel
        right={
          <Pressable onPress={() => setAddingPlan((v) => !v)} hitSlop={8}>
            <Text style={[typography.caption, { color: colors.primary }]}>{addingPlan ? 'close' : '+ add'}</Text>
          </Pressable>
        }
      >
        If → then
      </SectionLabel>
      {addingPlan ? (
        <Card style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
          <TextField label="If…" value={newSituation} onChangeText={setNewSituation} placeholder="the situation" />
          <TextField label="then…" value={newResponse} onChangeText={setNewResponse} placeholder="exactly what I do" multiline style={{ minHeight: 60, textAlignVertical: 'top' }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {PLAN_CATEGORIES.map((c) => (
              <Chip key={c} label={c.replace('_', ' ')} selected={newCategory === c} onPress={() => setNewCategory(c)} />
            ))}
          </View>
          <Button
            label="Save plan"
            disabled={!newSituation.trim() || !newResponse.trim()}
            loading={createPlan.isPending}
            onPress={() =>
              createPlan.mutate(
                { situation: newSituation.trim(), response: newResponse.trim(), category: newCategory, attempt_id: attempt.id },
                {
                  onSuccess: () => {
                    setNewSituation('');
                    setNewResponse('');
                    setAddingPlan(false);
                  },
                }
              )
            }
          />
        </Card>
      ) : null}
      <Card style={{ paddingVertical: spacing.xs }}>
        {plans.map((p) => {
          const open = expandedPlan === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setExpandedPlan(open ? null : p.id)}
              accessibilityRole="button"
              style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600', flex: 1 }]}>If {p.situation.toLowerCase()}</Text>
                <Text style={[typography.caption, { color: colors.textFaint }]}>{p.category.replace('_', ' ')}</Text>
              </View>
              {open ? (
                <>
                  <Text style={[typography.body, { color: colors.text, marginTop: 4 }]}>→ {p.response}</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'center' }}>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      held {p.times_held}/{p.times_triggered}
                    </Text>
                    <Chip label="archive" onPress={() => updatePlan.mutate({ id: p.id, patch: { is_active: false } })} />
                  </View>
                </>
              ) : null}
            </Pressable>
          );
        })}
      </Card>

      {/* Toolkit */}
      <SectionLabel>Toolkit</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        {tools.map((t) => (
          <View key={t.id} style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{t.name}</Text>
              <Text style={[typography.caption, { color: colors.textFaint }]}>
                {t.minutes} min{t.times_used ? ` · ${t.times_used}× · ${t.helpful_votes} worked` : ''}
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>{t.instructions}</Text>
          </View>
        ))}
      </Card>

      {/* People */}
      <SectionLabel>People & lines</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        {contacts.map((c) => (
          <ContactRow key={c.id} c={c} />
        ))}
        <Text style={[typography.caption, { color: colors.textFaint, marginTop: spacing.sm }]}>
          Thoughts of hurting yourself, panic that will not settle, or three nights of no sleep: call, do not deliberate.
        </Text>
      </Card>

      {/* Reasons */}
      {attempt.reasons.length > 0 ? (
        <>
          <SectionLabel>Why</SectionLabel>
          <Card>
            {attempt.reasons.map((r) => (
              <Text key={r} style={[typography.body, { color: colors.text, marginBottom: 4 }]}>
                · {r}
              </Text>
            ))}
            {attempt.baseline_use ? (
              <Text style={[typography.caption, { color: colors.textFaint, marginTop: spacing.sm }]}>Before: {attempt.baseline_use}</Text>
            ) : null}
          </Card>
        </>
      ) : null}

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}
