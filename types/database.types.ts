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

export type ReelIdeaStatus = 'new' | 'saved' | 'planned' | 'filmed' | 'posted';

export type ReelIdea = {
  id: string;
  user_id: string;
  title: string;
  hook: string;
  outline: string;
  format: string;
  status: ReelIdeaStatus;
  created_at: string;
  updated_at: string;
};

export type EditPlanShot = { shot: string; note: string; done?: boolean };
export type EditPlanBeat = { start: number; end: number; description: string };

export type EditPlan = {
  id: string;
  user_id: string;
  idea_id: string;
  shot_list: EditPlanShot[];
  beats: EditPlanBeat[];
  caption: string;
  hashtags: string;
  music: string;
  created_at: string;
};

export type IgSnapshot = {
  id: string;
  user_id: string;
  followers: number;
  following: number;
  media_count: number;
  captured_at: string;
};

export type IgMediaStat = {
  id: string;
  user_id: string;
  media_id: string;
  caption: string | null;
  permalink: string | null;
  thumbnail_url: string | null; // added by migration 0006
  posted_at: string | null;
  plays: number | null;
  likes: number;
  comments: number;
  captured_at: string;
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
    };
  };
};
