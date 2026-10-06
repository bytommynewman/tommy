// Placeholder types — regenerate against the real project once it's linked:
//   npx supabase gen types typescript --project-id <ref> --schema public > types/database.types.ts
// Keep this file up to date after every migration so schema and TS types can't drift.

export type HabitKind = 'build' | 'recovery';
export type HabitTargetType = 'boolean' | 'count' | 'duration' | 'abstinence';
export type HabitLogStatus = 'done' | 'skipped' | 'partial';
export type ScratchRole = 'user' | 'assistant';

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

export type ScratchMessage = {
  id: string;
  user_id: string;
  role: ScratchRole;
  content: string;
  created_at: string;
};

export type ScratchMessageInsert = {
  role: ScratchRole;
  content: string;
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

// --- Quit tracker (migration 0011) -------------------------------------------

export type QuitSubstance = 'cannabis' | 'nicotine' | 'alcohol' | 'other';
export type QuitMethod = 'cold_turkey' | 'taper';
export type QuitStatus = 'active' | 'completed' | 'abandoned';
export type CravingOutcome = 'passed' | 'used' | 'partial';
export type CopingToolKind = 'move' | 'body' | 'mind' | 'social' | 'swap' | 'build';
export type CopingToolSetting = 'anywhere' | 'home' | 'out';
export type IfThenCategory =
  | 'general' | 'night_out' | 'home' | 'sleep' | 'food' | 'social' | 'mood' | 'nicotine' | 'alcohol' | 'ex';
export type SupportRole = 'parent' | 'family' | 'therapist' | 'doctor' | 'friend' | 'crisis_line' | 'other';
export type SupportKnows = 'full' | 'partial' | 'none';

export type QuitAttempt = {
  id: string;
  user_id: string;
  habit_id: string | null;
  substance: QuitSubstance;
  method: QuitMethod;
  started_at: string;
  ended_at: string | null;
  status: QuitStatus;
  baseline_use: string | null;
  baseline_cost_cents_per_week: number;
  reasons: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WithdrawalCheckin = {
  id: string;
  user_id: string;
  attempt_id: string;
  checkin_date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  appetite: number | null;
  mood: number | null;
  anxiety: number | null;
  irritability: number | null;
  energy: number | null;
  craving_peak: number | null;
  vivid_dreams: boolean;
  night_sweats: boolean;
  headache: boolean;
  nausea: boolean;
  meals_count: number | null;
  ate_breakfast: boolean;
  worked_out: boolean;
  got_outside: boolean;
  used_cannabis: boolean;
  nicotine_level: number | null;
  drinks_count: number | null;
  cws_items: Record<string, number> | null;
  cws_total: number | null;
  cws_interference: number | null;
  win: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Craving = {
  id: string;
  user_id: string;
  attempt_id: string;
  occurred_at: string;
  intensity: number;
  hungry: boolean;
  angry: boolean;
  lonely: boolean;
  tired: boolean;
  trigger_tags: string[];
  context: string | null;
  coping_action: string | null;
  coping_tool_id: string | null;
  duration_minutes: number | null;
  outcome: CravingOutcome | null;
  intensity_after: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CopingTool = {
  id: string;
  user_id: string;
  name: string;
  kind: CopingToolKind;
  instructions: string;
  minutes: number;
  setting: CopingToolSetting;
  sort_order: number;
  is_active: boolean;
  times_used: number;
  helpful_votes: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IfThenPlan = {
  id: string;
  user_id: string;
  attempt_id: string | null;
  situation: string;
  response: string;
  category: IfThenCategory;
  sort_order: number;
  is_active: boolean;
  times_triggered: number;
  times_held: number;
  created_at: string;
  updated_at: string;
};

export type QuitMilestone = {
  id: string;
  user_id: string;
  attempt_id: string;
  day_number: number;
  title: string;
  what_to_expect: string | null;
  reward: string | null;
  reached_at: string | null;
  reward_claimed: boolean;
  created_at: string;
  updated_at: string;
};

export type SupportContact = {
  id: string;
  user_id: string;
  name: string;
  role: SupportRole;
  phone: string | null;
  text_ok: boolean;
  late_night_ok: boolean;
  knows: SupportKnows;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// Documentation-only: the supabase client is currently untyped (see lib/supabase.ts).
// Wiring `createClient<Database>` would require revisiting the Insert shapes below
// that currently rely on DB defaults (e.g. server-side `default auth.uid()`).
export type Database = {
  public: {
    Tables: {
      habits: {
        Row: Habit;
        Insert: Omit<Habit, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Habit, 'id' | 'created_at' | 'updated_at'>>;
      };
      habit_logs: {
        Row: HabitLog;
        Insert: Omit<HabitLog, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<HabitLog, 'id' | 'created_at' | 'updated_at'>>;
      };
      relapse_incidents: {
        Row: RelapseIncident;
        Insert: Omit<RelapseIncident, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<RelapseIncident, 'id' | 'created_at' | 'updated_at'>>;
      };
      scratch_messages: {
        Row: ScratchMessage;
        Insert: ScratchMessageInsert;
        Update: Partial<ScratchMessageInsert>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'created_at' | 'updated_at'>>;
      };
      quit_attempts: {
        Row: QuitAttempt;
        Insert: Partial<Omit<QuitAttempt, 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<QuitAttempt, 'id' | 'created_at' | 'updated_at'>>;
      };
      withdrawal_checkins: {
        Row: WithdrawalCheckin;
        Insert: Partial<Omit<WithdrawalCheckin, 'id' | 'created_at' | 'updated_at'>> &
          Pick<WithdrawalCheckin, 'attempt_id' | 'checkin_date'>;
        Update: Partial<Omit<WithdrawalCheckin, 'id' | 'created_at' | 'updated_at'>>;
      };
      cravings: {
        Row: Craving;
        Insert: Partial<Omit<Craving, 'id' | 'created_at' | 'updated_at'>> & Pick<Craving, 'attempt_id' | 'intensity'>;
        Update: Partial<Omit<Craving, 'id' | 'created_at' | 'updated_at'>>;
      };
      coping_tools: {
        Row: CopingTool;
        Insert: Partial<Omit<CopingTool, 'id' | 'created_at' | 'updated_at'>> & Pick<CopingTool, 'name' | 'kind'>;
        Update: Partial<Omit<CopingTool, 'id' | 'created_at' | 'updated_at'>>;
      };
      if_then_plans: {
        Row: IfThenPlan;
        Insert: Partial<Omit<IfThenPlan, 'id' | 'created_at' | 'updated_at'>> & Pick<IfThenPlan, 'situation' | 'response'>;
        Update: Partial<Omit<IfThenPlan, 'id' | 'created_at' | 'updated_at'>>;
      };
      quit_milestones: {
        Row: QuitMilestone;
        Insert: Partial<Omit<QuitMilestone, 'id' | 'created_at' | 'updated_at'>> &
          Pick<QuitMilestone, 'attempt_id' | 'day_number' | 'title'>;
        Update: Partial<Omit<QuitMilestone, 'id' | 'created_at' | 'updated_at'>>;
      };
      support_contacts: {
        Row: SupportContact;
        Insert: Partial<Omit<SupportContact, 'id' | 'created_at' | 'updated_at'>> & Pick<SupportContact, 'name' | 'role'>;
        Update: Partial<Omit<SupportContact, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
};
