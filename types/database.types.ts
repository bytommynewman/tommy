// Placeholder types — regenerate against the real project once it's linked:
//   npx supabase gen types typescript --project-id <ref> --schema public > types/database.types.ts
// Keep this file up to date after every migration so schema and TS types can't drift.

export type HabitKind = 'build' | 'recovery';
export type HabitTargetType = 'boolean' | 'count' | 'duration' | 'abstinence';
export type HabitLogStatus = 'done' | 'skipped' | 'partial';

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  kind: HabitKind;
  category: string | null;
  target_type: HabitTargetType;
  target_value: number | null;
  color: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type HabitLog = {
  id: string;
  user_id: string;
  habit_id: string;
  log_date: string;
  status: HabitLogStatus;
  value: number | null;
  craving_intensity: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RelapseIncident = {
  id: string;
  user_id: string;
  habit_id: string;
  occurred_at: string;
  trigger: string | null;
  trigger_tags: string[];
  amount: number | null;
  severity: number | null;
  support_used: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  user_id: string;
  display_name: string | null;
  timezone: string;
  birthdate: string | null;
  context_summary: string | null;
  crisis_resources_ack: boolean;
  created_at: string;
  updated_at: string;
};
