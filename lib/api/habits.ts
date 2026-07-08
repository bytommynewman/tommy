import { supabase } from '../supabase';
import type { Habit, HabitKind, HabitLog, HabitLogStatus, HabitTargetType, RelapseIncident } from '../../types/database.types';

export async function fetchHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('is_archived', false)
    .order('kind', { ascending: false }) // recovery first
    .order('created_at');
  if (error) throw error;
  return data as Habit[];
}

export async function createHabit(input: {
  name: string;
  kind: HabitKind;
  category?: string;
  target_type?: HabitTargetType;
  target_value?: number | null;
}): Promise<Habit> {
  const { data, error } = await supabase.from('habits').insert(input).select().single();
  if (error) throw error;
  return data as Habit;
}

export async function archiveHabit(habitId: string): Promise<void> {
  const { error } = await supabase.from('habits').update({ is_archived: true }).eq('id', habitId);
  if (error) throw error;
}

export async function fetchLogsSince(sinceDate: string): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .gte('log_date', sinceDate)
    .order('log_date', { ascending: false });
  if (error) throw error;
  return data as HabitLog[];
}

export async function upsertLog(input: {
  habit_id: string;
  log_date: string;
  status: HabitLogStatus;
  value?: number | null;
  craving_intensity?: number | null;
  notes?: string | null;
}): Promise<HabitLog> {
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert(input, { onConflict: 'habit_id,log_date' })
    .select()
    .single();
  if (error) throw error;
  return data as HabitLog;
}

export async function fetchRelapses(limit = 50): Promise<RelapseIncident[]> {
  const { data, error } = await supabase
    .from('relapse_incidents')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as RelapseIncident[];
}

export async function createRelapse(input: {
  habit_id: string;
  occurred_at?: string;
  trigger?: string | null;
  trigger_tags?: string[];
  amount?: number | null;
  severity?: number | null;
  support_used?: boolean;
  notes?: string | null;
}): Promise<RelapseIncident> {
  const { data, error } = await supabase.from('relapse_incidents').insert(input).select().single();
  if (error) throw error;
  return data as RelapseIncident;
}
