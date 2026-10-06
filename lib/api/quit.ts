import { supabase } from '../supabase';
import type {
  CopingTool,
  Craving,
  CravingOutcome,
  IfThenPlan,
  QuitAttempt,
  QuitMilestone,
  SupportContact,
  WithdrawalCheckin,
} from '../../types/database.types';
import {
  DEFAULT_COPING_TOOLS,
  DEFAULT_IF_THEN_PLANS,
  DEFAULT_MILESTONES,
  DEFAULT_SUPPORT_CONTACTS,
} from '../../constants/quit';
import { cwsTotal } from '../quitLogic';

// --- Attempt ------------------------------------------------------------------

export async function fetchActiveAttempt(): Promise<QuitAttempt | null> {
  const { data, error } = await supabase
    .from('quit_attempts')
    .select('*')
    .eq('status', 'active')
    .eq('substance', 'cannabis')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as QuitAttempt | null) ?? null;
}

export type StartQuitInput = {
  started_at: string; // ISO
  baseline_use: string;
  baseline_cost_cents_per_week: number;
  reasons: string[];
};

// Starts the quit: creates (or reuses) a recovery habit so the existing
// days-clean streak + Scratch agent see it, creates the attempt, and seeds
// the default toolkit. Seeding is idempotent per table: if the user already
// has tools / plans / contacts from an earlier attempt they are kept.
export async function startQuit(input: StartQuitInput): Promise<QuitAttempt> {
  const habitId = await ensureCannabisHabit();

  const { data: attempt, error } = await supabase
    .from('quit_attempts')
    .insert({
      habit_id: habitId,
      substance: 'cannabis',
      method: 'cold_turkey',
      started_at: input.started_at,
      baseline_use: input.baseline_use,
      baseline_cost_cents_per_week: input.baseline_cost_cents_per_week,
      reasons: input.reasons,
    })
    .select()
    .single();
  if (error) throw error;
  const created = attempt as QuitAttempt;

  await Promise.all([
    seedIfEmpty('coping_tools', DEFAULT_COPING_TOOLS.map((t, i) => ({ ...t, sort_order: i }))),
    seedIfEmpty(
      'if_then_plans',
      DEFAULT_IF_THEN_PLANS.map((p, i) => ({ ...p, attempt_id: created.id, sort_order: i }))
    ),
    seedIfEmpty('support_contacts', DEFAULT_SUPPORT_CONTACTS.map((c, i) => ({ ...c, sort_order: i }))),
    supabase.from('quit_milestones').insert(
      DEFAULT_MILESTONES.map((m) => ({
        attempt_id: created.id,
        day_number: m.day,
        title: m.title,
        what_to_expect: m.what_to_expect,
        reward: null,
      }))
    ),
  ]);

  return created;
}

async function ensureCannabisHabit(): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from('habits')
    .select('id')
    .eq('kind', 'recovery')
    .eq('is_archived', false)
    .or('category.eq.cannabis,name.ilike.weed,name.ilike.cannabis')
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from('habits')
    .insert({ name: 'Weed', kind: 'recovery', category: 'cannabis', target_type: 'abstinence' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function seedIfEmpty(table: 'coping_tools' | 'if_then_plans' | 'support_contacts', rows: object[]) {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
  if (error) throw error;
  if ((count ?? 0) > 0) return;
  const { error: insertError } = await supabase.from(table).insert(rows);
  if (insertError) throw insertError;
}

export async function updateAttempt(id: string, patch: Partial<QuitAttempt>): Promise<QuitAttempt> {
  const { data, error } = await supabase.from('quit_attempts').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as QuitAttempt;
}

// --- Check-ins ----------------------------------------------------------------

export async function fetchCheckins(attemptId: string): Promise<WithdrawalCheckin[]> {
  const { data, error } = await supabase
    .from('withdrawal_checkins')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('checkin_date', { ascending: false });
  if (error) throw error;
  return data as WithdrawalCheckin[];
}

export type CheckinInput = Partial<Omit<WithdrawalCheckin, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
  attempt_id: string;
  checkin_date: string;
};

export async function upsertCheckin(input: CheckinInput): Promise<WithdrawalCheckin> {
  const payload = { ...input, cws_total: input.cws_items ? cwsTotal(input.cws_items) : input.cws_total ?? null };
  const { data, error } = await supabase
    .from('withdrawal_checkins')
    .upsert(payload, { onConflict: 'attempt_id,checkin_date' })
    .select()
    .single();
  if (error) throw error;
  return data as WithdrawalCheckin;
}

// --- Cravings -----------------------------------------------------------------

export async function fetchCravings(attemptId: string, limit = 200): Promise<Craving[]> {
  const { data, error } = await supabase
    .from('cravings')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Craving[];
}

export type CravingInput = {
  attempt_id: string;
  intensity: number;
  occurred_at?: string;
  hungry?: boolean;
  angry?: boolean;
  lonely?: boolean;
  tired?: boolean;
  trigger_tags?: string[];
  context?: string | null;
  coping_action?: string | null;
  coping_tool_id?: string | null;
  notes?: string | null;
};

export async function createCraving(input: CravingInput): Promise<Craving> {
  const { data, error } = await supabase.from('cravings').insert(input).select().single();
  if (error) throw error;
  return data as Craving;
}

export async function resolveCraving(
  id: string,
  patch: { outcome: CravingOutcome; intensity_after?: number | null; duration_minutes?: number | null; notes?: string | null }
): Promise<Craving> {
  const { data, error } = await supabase.from('cravings').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Craving;
}

// --- Toolkit ------------------------------------------------------------------

export async function fetchCopingTools(): Promise<CopingTool[]> {
  const { data, error } = await supabase
    .from('coping_tools')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data as CopingTool[];
}

export async function markToolUsed(tool: CopingTool, helpful: boolean | null): Promise<void> {
  const { error } = await supabase
    .from('coping_tools')
    .update({
      times_used: tool.times_used + 1,
      helpful_votes: tool.helpful_votes + (helpful ? 1 : 0),
      last_used_at: new Date().toISOString(),
    })
    .eq('id', tool.id);
  if (error) throw error;
}

export async function createCopingTool(input: Pick<CopingTool, 'name' | 'kind' | 'instructions' | 'minutes' | 'setting'>): Promise<CopingTool> {
  const { data, error } = await supabase.from('coping_tools').insert(input).select().single();
  if (error) throw error;
  return data as CopingTool;
}

export async function fetchIfThenPlans(): Promise<IfThenPlan[]> {
  const { data, error } = await supabase.from('if_then_plans').select('*').eq('is_active', true).order('sort_order');
  if (error) throw error;
  return data as IfThenPlan[];
}

export async function createIfThenPlan(input: Pick<IfThenPlan, 'situation' | 'response' | 'category'> & { attempt_id?: string | null }): Promise<IfThenPlan> {
  const { data, error } = await supabase.from('if_then_plans').insert(input).select().single();
  if (error) throw error;
  return data as IfThenPlan;
}

export async function bumpIfThenPlan(plan: IfThenPlan, held: boolean): Promise<void> {
  const { error } = await supabase
    .from('if_then_plans')
    .update({ times_triggered: plan.times_triggered + 1, times_held: plan.times_held + (held ? 1 : 0) })
    .eq('id', plan.id);
  if (error) throw error;
}

export async function updateIfThenPlan(id: string, patch: Partial<IfThenPlan>): Promise<void> {
  const { error } = await supabase.from('if_then_plans').update(patch).eq('id', id);
  if (error) throw error;
}

// --- Milestones ---------------------------------------------------------------

export async function fetchMilestones(attemptId: string): Promise<QuitMilestone[]> {
  const { data, error } = await supabase
    .from('quit_milestones')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('day_number');
  if (error) throw error;
  return data as QuitMilestone[];
}

export async function updateMilestone(id: string, patch: Partial<QuitMilestone>): Promise<void> {
  const { error } = await supabase.from('quit_milestones').update(patch).eq('id', id);
  if (error) throw error;
}

// --- Support contacts ---------------------------------------------------------

export async function fetchSupportContacts(): Promise<SupportContact[]> {
  const { data, error } = await supabase.from('support_contacts').select('*').order('sort_order');
  if (error) throw error;
  return data as SupportContact[];
}

export async function updateSupportContact(id: string, patch: Partial<SupportContact>): Promise<void> {
  const { error } = await supabase.from('support_contacts').update(patch).eq('id', id);
  if (error) throw error;
}
