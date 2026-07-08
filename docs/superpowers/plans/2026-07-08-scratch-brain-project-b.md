# Scratch Brain — Project B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Scratch a real brain — a Supabase Edge Function that calls Claude with tools over the user's own data, powering live chat (with actions: check off habits, create habits, log slips), the AI-written Daily Read, and persisted conversation history.

**Architecture:** A Deno edge function (`scratch-agent`) authenticates the caller's JWT, loads a context snapshot of their data through an RLS-scoped Supabase client, and runs a manual Claude tool-use loop (Anthropic TypeScript SDK via `npm:` specifier). Tools execute against the same user-scoped client, so Scratch can only ever touch the caller's rows. The app talks to it through the standard `lib/api` → `lib/hooks` → screen layering; ChatSheet and DailyReadCard swap their placeholders for live data with graceful not-configured/error fallbacks. Messages persist in a new `scratch_messages` table.

**Tech Stack:** Supabase Edge Functions (Deno), `@anthropic-ai/sdk` (npm specifier), `@supabase/supabase-js@2`, model `claude-opus-4-8`, TanStack Query, AsyncStorage (daily-read day cache), vitest for pure helpers.

**Spec:** `docs/superpowers/specs/2026-07-08-scratch-and-nav-v2-design.md` (Project B sections)

## Global Constraints

- `ANTHROPIC_API_KEY` exists ONLY as a Supabase Edge Function secret — never in the repo, `.env`, or app bundle. The function must degrade cleanly when it's unset (`{ error: 'not_configured' }`, HTTP 200).
- Model: `claude-opus-4-8` via a single `MODEL` constant (the one sanctioned knob for cost tuning later). Do NOT pass `temperature`/`top_p`/`top_k` or `thinking` config — sampling params are rejected on this model, and thinking stays off by omitting the parameter.
- All function data access uses a Supabase client constructed with the caller's `Authorization` header (RLS-scoped). Never the service-role key.
- App code keeps the layering: screens call hooks (`lib/hooks/useScratch.ts`), hooks call `lib/api/scratch.ts`, which calls `supabase.functions.invoke`. No direct fetches from components.
- TypeScript strict for app code: `npx tsc --noEmit` (edge function files are excluded from the app's tsconfig — see Task 3); `npm test` green (15 existing + new).
- Chat/brief failures never blank a page: ChatSheet shows a setup card (not configured) or retry line (error); DailyReadCard falls back to its local composition.
- Migration 0003 follows the existing conventions: `user_id default auth.uid()`, RLS `auth.uid() = user_id`, applied manually via Supabase Studio SQL editor.
- Commit after every task on branch `golf-home`. Deploy/secrets/migration execution are HUMAN steps (Task 6 runbook) — never run `supabase login`, `secrets set`, or `functions deploy` from a subagent.

---

### Task 1: `scratch_messages` migration + app types

**Files:**
- Create: `supabase/migrations/0003_scratch_messages.sql`
- Modify: `types/database.types.ts`

**Interfaces:**
- Produces: table `scratch_messages(id uuid pk, user_id uuid default auth.uid(), role text check in ('user','assistant'), content text, created_at timestamptz)`; TS types `ScratchMessage`, `ScratchMessageInsert` and the `scratch_messages` entry in the `Database` type — consumed by Tasks 3–4.

- [ ] **Step 1: Write the migration** — create `supabase/migrations/0003_scratch_messages.sql` (mirror the style of `0002_habits_recovery.sql` — read it first):

```sql
-- M-scratch: persisted conversation with the Scratch agent.
create table public.scratch_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.scratch_messages enable row level security;

create policy "Users manage own scratch messages"
  on public.scratch_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index scratch_messages_user_created_idx
  on public.scratch_messages (user_id, created_at desc);
```

- [ ] **Step 2: Add the types** — in `types/database.types.ts`, following the file's existing hand-written pattern (read it first; mirror how `habits` is declared), add:

```ts
export type ScratchRole = 'user' | 'assistant';

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
```

and register `scratch_messages: { Row: ScratchMessage; Insert: ScratchMessageInsert; Update: Partial<ScratchMessageInsert> }` inside the `Database` type's `Tables` block, matching the existing entries' shape exactly.

- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean; `npm test` 15/15.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_scratch_messages.sql types/database.types.ts
git commit -m "feat: scratch_messages table (migration 0003) and types"
```

---

### Task 2: Edge-function pure helpers with tests (TDD)

**Files:**
- Create: `supabase/functions/scratch-agent/logic.ts`
- Test: `lib/__tests__/scratchLogic.test.ts`

**Interfaces:**
- Produces (imported by Task 3's `index.ts`, and importable by vitest because it has NO Deno/npm-specifier imports — plain TS only):
  - `daysCleanFrom(createdAt: string, relapseTimes: string[], now?: Date): number` — days since the later of habit creation and last relapse (UTC-day granularity, mirrors `lib/streaks.ts` semantics)
  - `buildContextBlock(ctx: ScratchContext): string` — deterministic, compact text block describing the user's data for the system prompt
  - `type ScratchContext = { firstName: string; today: string; habits: { id: string; name: string; kind: string; daysClean: number | null }[]; doneToday: string[]; remainingToday: string[] }`
  - `SCRATCH_SYSTEM: string` — Scratch's personality prompt (constant)

- [ ] **Step 1: Write the failing tests** — create `lib/__tests__/scratchLogic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { daysCleanFrom, buildContextBlock, SCRATCH_SYSTEM } from '../../supabase/functions/scratch-agent/logic';

describe('daysCleanFrom', () => {
  const now = new Date('2026-07-08T15:00:00Z');
  it('counts days since creation when there are no relapses', () => {
    expect(daysCleanFrom('2026-07-01T10:00:00Z', [], now)).toBe(7);
  });
  it('counts from the most recent relapse', () => {
    expect(daysCleanFrom('2026-06-01T10:00:00Z', ['2026-07-05T23:00:00Z', '2026-06-20T08:00:00Z'], now)).toBe(3);
  });
  it('returns 0 for a same-day relapse', () => {
    expect(daysCleanFrom('2026-06-01T10:00:00Z', ['2026-07-08T09:00:00Z'], now)).toBe(0);
  });
});

describe('buildContextBlock', () => {
  const ctx = {
    firstName: 'Tommy',
    today: '2026-07-08',
    habits: [
      { id: 'h1', name: 'Gym', kind: 'build', daysClean: null },
      { id: 'h2', name: 'No vaping', kind: 'recovery', daysClean: 12 },
    ],
    doneToday: ['Gym'],
    remainingToday: ['No vaping'],
  };
  it('includes name, date, every habit with its id, and today status', () => {
    const block = buildContextBlock(ctx);
    expect(block).toContain('Tommy');
    expect(block).toContain('2026-07-08');
    expect(block).toContain('Gym');
    expect(block).toContain('h2');
    expect(block).toContain('12 days clean');
    expect(block).toContain('Done today: Gym');
    expect(block).toContain('Still open: No vaping');
  });
  it('handles the empty state', () => {
    const block = buildContextBlock({ firstName: 'Tommy', today: '2026-07-08', habits: [], doneToday: [], remainingToday: [] });
    expect(block).toContain('no habits set up yet');
  });
});

describe('SCRATCH_SYSTEM', () => {
  it('sets the caddie persona and safety boundary', () => {
    expect(SCRATCH_SYSTEM).toContain('Scratch');
    expect(SCRATCH_SYSTEM).toContain('caddie');
    expect(SCRATCH_SYSTEM.toLowerCase()).toContain('not a therapist');
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL, cannot resolve `../../supabase/functions/scratch-agent/logic`.

- [ ] **Step 3: Implement `supabase/functions/scratch-agent/logic.ts`** (pure TS, no imports — runs in both Deno and vitest):

```ts
// Pure logic for the scratch-agent edge function. No Deno or npm-specifier
// imports here — this file is unit-tested with vitest from the app repo.

export type ScratchContext = {
  firstName: string;
  today: string; // YYYY-MM-DD
  habits: { id: string; name: string; kind: string; daysClean: number | null }[];
  doneToday: string[];
  remainingToday: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Mirrors lib/streaks.ts daysClean semantics: whole days since the later of
// habit creation and the most recent relapse.
export function daysCleanFrom(createdAt: string, relapseTimes: string[], now: Date = new Date()): number {
  let since = new Date(createdAt).getTime();
  for (const t of relapseTimes) {
    const ms = new Date(t).getTime();
    if (ms > since) since = ms;
  }
  const days = Math.floor((now.getTime() - since) / DAY_MS);
  return days < 0 ? 0 : days;
}

export function buildContextBlock(ctx: ScratchContext): string {
  const lines: string[] = [
    `User: ${ctx.firstName}. Today's date: ${ctx.today}.`,
  ];
  if (ctx.habits.length === 0) {
    lines.push('They have no habits set up yet — creating their first one would be a great first play.');
  } else {
    lines.push('Habits (id | name | kind | streak):');
    for (const h of ctx.habits) {
      const streak = h.daysClean == null ? '-' : `${h.daysClean} days clean`;
      lines.push(`- ${h.id} | ${h.name} | ${h.kind} | ${streak}`);
    }
    lines.push(`Done today: ${ctx.doneToday.length ? ctx.doneToday.join(', ') : 'nothing yet'}.`);
    lines.push(`Still open: ${ctx.remainingToday.length ? ctx.remainingToday.join(', ') : 'nothing — card is clean'}.`);
  }
  return lines.join('\n');
}

export const SCRATCH_SYSTEM = `You are Scratch, the user's personal AI caddie inside their life-planner app "Tommy". Persona: a sharp, upbeat golf caddie — bucket hat energy, plain talk, light golf slang ("the card", "the round", "protect the streak"), never corny overload. You are their organizer and accountability partner, NOT a therapist — if heavy emotional territory comes up, be kind, keep it brief, and suggest the app's Reflect section for journaling; do not play counselor.

You can act, not just talk: use your tools to check habits off, create habits, or log a slip when the user asks or clearly reports one. Confirm what you did in one short line. Never invent data — everything you know about their habits is in the context block. If asked to do something you have no tool for (calendar, goals, journal entries), say that part of the course is still under construction and point them to the right section.

Style: short replies (a few sentences), specific numbers over vague praise, one question max per reply. Use their first name occasionally, not constantly.`;
```

- [ ] **Step 4: Run to verify pass** — `npm test` → all pass (15 + 6 new = 21). `npx tsc --noEmit` clean (the file has no Deno imports, so the app's typecheck accepts it; Task 3 excludes the rest of the function directory).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scratch-agent/logic.ts lib/__tests__/scratchLogic.test.ts
git commit -m "feat: scratch-agent pure logic (context block, streaks, persona) with tests"
```

---

### Task 3: The edge function (`scratch-agent/index.ts`)

**Files:**
- Create: `supabase/functions/scratch-agent/index.ts`
- Create: `supabase/functions/scratch-agent/deno.json`
- Modify: `tsconfig.json` (exclude the function dir from the app typecheck)

**Interfaces:**
- Consumes: Task 2's `logic.ts`; tables `profiles`, `habits`, `habit_logs`, `relapse_incidents`, `scratch_messages`.
- Produces (the wire contract Task 4 codes against):
  - Request `{ mode: 'chat', text: string }` → `{ reply: string, actions: string[] }`
  - Request `{ mode: 'brief' }` → `{ reply: string }`
  - Not configured → HTTP 200 `{ error: 'not_configured' }`
  - Auth failure → HTTP 401 `{ error: 'unauthorized' }`; other failures → HTTP 500 `{ error: 'agent_failed' }`
  - Side effect in chat mode: persists the user message and assistant reply to `scratch_messages`.

- [ ] **Step 1: Exclude edge functions from the app typecheck** — in `tsconfig.json`, add (or extend) the `exclude` array with `"supabase/functions/**/index.ts"` (the `logic.ts` stays included — it's pure TS and vitest-covered). Keep everything else in the file unchanged.

- [ ] **Step 2: Create `supabase/functions/scratch-agent/deno.json`:**

```json
{
  "imports": {
    "@anthropic-ai/sdk": "npm:@anthropic-ai/sdk",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2"
  }
}
```

- [ ] **Step 3: Write `supabase/functions/scratch-agent/index.ts`:**

```ts
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { buildContextBlock, daysCleanFrom, SCRATCH_SYSTEM, type ScratchContext } from './logic.ts';

const MODEL = 'claude-opus-4-8'; // the one sanctioned cost/quality knob
const MAX_TOOL_ITERATIONS = 6;
const HISTORY_LIMIT = 30;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'not_configured' });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);

  const anthropic = new Anthropic({ apiKey });

  try {
    const body = await req.json();
    const context = await loadContext(supabase);
    const system = `${SCRATCH_SYSTEM}\n\n<user_context>\n${buildContextBlock(context)}\n</user_context>`;

    if (body.mode === 'brief') {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: [
          {
            role: 'user',
            content:
              "Write today's Daily Read for me: 2-3 short lines on how my round is going — streaks worth protecting, what's still open today, one concrete nudge. No greeting, no sign-off, just the read.",
          },
        ],
      });
      return json({ reply: textOf(response) });
    }

    if (body.mode === 'chat' && typeof body.text === 'string' && body.text.trim()) {
      const userText = body.text.trim();
      const { data: historyRows } = await supabase
        .from('scratch_messages')
        .select('role, content')
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT);
      const history = (historyRows ?? [])
        .reverse()
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      await supabase.from('scratch_messages').insert({ role: 'user', content: userText });

      const { reply, actions } = await runAgentLoop(anthropic, supabase, system, [
        ...history,
        { role: 'user', content: userText },
      ]);

      await supabase.from('scratch_messages').insert({ role: 'assistant', content: reply });
      return json({ reply, actions });
    }

    return json({ error: 'bad_request' }, 400);
  } catch (err) {
    console.error('scratch-agent error', err);
    return json({ error: 'agent_failed' }, 500);
  }
});

function textOf(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

// deno-lint-ignore no-explicit-any
async function loadContext(supabase: any): Promise<ScratchContext> {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: profile }, { data: habits }, { data: logs }, { data: relapses }] = await Promise.all([
    supabase.from('profiles').select('display_name').maybeSingle(),
    supabase.from('habits').select('id, name, kind, created_at'),
    supabase.from('habit_logs').select('habit_id, log_date, status').eq('log_date', today),
    supabase.from('relapse_incidents').select('habit_id, occurred_at'),
  ]);

  const doneIds = new Set(
    (logs ?? []).filter((l: { status: string }) => l.status === 'done').map((l: { habit_id: string }) => l.habit_id)
  );
  const habitList = (habits ?? []).map(
    (h: { id: string; name: string; kind: string; created_at: string }) => ({
      id: h.id,
      name: h.name,
      kind: h.kind,
      daysClean:
        h.kind === 'recovery'
          ? daysCleanFrom(
              h.created_at,
              (relapses ?? [])
                .filter((r: { habit_id: string }) => r.habit_id === h.id)
                .map((r: { occurred_at: string }) => r.occurred_at)
            )
          : null,
    })
  );

  return {
    firstName: profile?.display_name?.split(' ')[0] ?? 'there',
    today,
    habits: habitList,
    doneToday: habitList.filter((h: { id: string }) => doneIds.has(h.id)).map((h: { name: string }) => h.name),
    remainingToday: habitList.filter((h: { id: string }) => !doneIds.has(h.id)).map((h: { name: string }) => h.name),
  };
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'upsert_habit_log',
    description:
      "Mark one of the user's habits done or skipped for a date. Use the habit id from the context block. Date is YYYY-MM-DD; use today's date unless the user names another day.",
    input_schema: {
      type: 'object',
      properties: {
        habit_id: { type: 'string', description: 'Habit id from the context block' },
        log_date: { type: 'string', description: 'YYYY-MM-DD' },
        status: { type: 'string', enum: ['done', 'skipped'] },
      },
      required: ['habit_id', 'log_date', 'status'],
    },
  },
  {
    name: 'create_habit',
    description:
      'Create a new habit. kind "build" = something to do regularly (gym, reading). kind "recovery" = something to stay clean from (a streak is tracked).',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        kind: { type: 'string', enum: ['build', 'recovery'] },
      },
      required: ['name', 'kind'],
    },
  },
  {
    name: 'log_relapse',
    description:
      'Log a slip on a recovery habit, resetting its clean streak. ONLY when the user clearly reports a slip themselves. Be supportive, never judgmental.',
    input_schema: {
      type: 'object',
      properties: {
        habit_id: { type: 'string' },
        note: { type: 'string', description: 'Optional short note the user gave about the slip' },
      },
      required: ['habit_id'],
    },
  },
  {
    name: 'list_recent_logs',
    description: "Fetch the user's habit check-off history for the last N days (max 60), for questions about past consistency.",
    input_schema: {
      type: 'object',
      properties: { days: { type: 'integer', description: '1-60' } },
      required: ['days'],
    },
  },
];

async function runAgentLoop(
  anthropic: Anthropic,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  system: string,
  messages: Anthropic.MessageParam[]
): Promise<{ reply: string; actions: string[] }> {
  const actions: string[] = [];
  let response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    tools: TOOLS,
    messages,
  });

  let iterations = 0;
  while (response.stop_reason === 'tool_use' && iterations < MAX_TOOL_ITERATIONS) {
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      let content: string;
      let isError = false;
      try {
        const outcome = await runTool(supabase, block.name, block.input as Record<string, unknown>);
        content = outcome.result;
        if (outcome.summary) actions.push(outcome.summary);
      } catch (err) {
        content = `Error: ${err instanceof Error ? err.message : 'tool failed'}`;
        isError = true;
      }
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content, is_error: isError });
    }
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system,
      tools: TOOLS,
      messages,
    });
    iterations++;
  }

  const reply = textOf(response) || "Scratch tipped his hat but didn't say anything — try that one again.";
  return { reply, actions };
}

async function runTool(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  name: string,
  input: Record<string, unknown>
): Promise<{ result: string; summary: string | null }> {
  switch (name) {
    case 'upsert_habit_log': {
      const { error } = await supabase
        .from('habit_logs')
        .upsert(
          { habit_id: input.habit_id, log_date: input.log_date, status: input.status },
          { onConflict: 'habit_id,log_date' }
        );
      if (error) throw new Error(error.message);
      return {
        result: `Logged ${input.status} for ${input.log_date}.`,
        summary: `${input.status === 'done' ? 'Checked off' : 'Marked skipped'} a habit for ${input.log_date}`,
      };
    }
    case 'create_habit': {
      const { data, error } = await supabase
        .from('habits')
        .insert({ name: input.name, kind: input.kind })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return { result: `Created habit "${input.name}" (${input.kind}) with id ${data.id}.`, summary: `Created habit "${input.name}"` };
    }
    case 'log_relapse': {
      const { error } = await supabase
        .from('relapse_incidents')
        .insert({ habit_id: input.habit_id, note: (input.note as string) ?? null });
      if (error) throw new Error(error.message);
      return { result: 'Slip logged. Streak resets from now.', summary: 'Logged a slip' };
    }
    case 'list_recent_logs': {
      const days = Math.min(Math.max(Number(input.days) || 7, 1), 60);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('habit_logs')
        .select('habit_id, log_date, status')
        .gte('log_date', since)
        .order('log_date', { ascending: false });
      if (error) throw new Error(error.message);
      return { result: JSON.stringify(data ?? []), summary: null };
    }
    default:
      return { result: `Unknown tool ${name}.`, summary: null };
  }
}
```

Notes baked into the code: parallel `tool_use` blocks all get their `tool_result` in ONE user message; failed tools return `is_error: true` instead of crashing the loop; `relapse_incidents`'s column is `occurred_at` — VERIFY against `supabase/migrations/0002_habits_recovery.sql` while implementing and adjust the two references if the actual column name differs (same for `note`).

- [ ] **Step 4: Verify** — `npx tsc --noEmit` (app unaffected; function index excluded) and `npm test` (21 green). If `deno` is installed (`deno --version`), also run `deno check supabase/functions/scratch-agent/index.ts`; if it isn't, note that in the report — the runbook's `supabase functions deploy` performs the authoritative check.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scratch-agent/ tsconfig.json
git commit -m "feat: scratch-agent edge function — Claude tool loop over user data"
```

---

### Task 4: App API + hooks (`lib/api/scratch.ts`, `lib/hooks/useScratch.ts`)

**Files:**
- Create: `lib/api/scratch.ts`
- Create: `lib/hooks/useScratch.ts`

**Interfaces:**
- Consumes: Task 3's wire contract; `ScratchMessage` type (Task 1); existing `lib/supabase.ts`, `lib/queryClient.ts` patterns (read `lib/api/habits.ts` and `lib/hooks/useHabits.ts` first and mirror them).
- Produces (consumed by Task 5):
  - `fetchScratchMessages(): Promise<ScratchMessage[]>` (oldest-first, last 30)
  - `sendToScratch(text: string): Promise<{ reply: string; actions: string[] } | { error: string }>`
  - `fetchDailyRead(): Promise<{ reply: string } | { error: string }>`
  - `useScratchMessages()` — query, key `['scratch_messages']`
  - `useSendToScratch()` — mutation; on success invalidates `['scratch_messages']` and, when `actions.length > 0`, also `['habits']`, `['habit_logs']`, `['relapse_incidents']` (VERIFY the exact query keys against `lib/hooks/useHabits.ts` and use those)
  - `useDailyRead()` — query, key `['scratch_daily_read', todayKey]`, AsyncStorage-cached per day; returns `{ reply: string } | null` (null = unavailable → caller falls back to local)

- [ ] **Step 1: Write `lib/api/scratch.ts`:**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import type { ScratchMessage } from '../../types/database.types';

export type ScratchReply = { reply: string; actions: string[] };
export type ScratchFailure = { error: string };

export async function fetchScratchMessages(): Promise<ScratchMessage[]> {
  const { data, error } = await supabase
    .from('scratch_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).reverse();
}

export async function sendToScratch(text: string): Promise<ScratchReply | ScratchFailure> {
  const { data, error } = await supabase.functions.invoke('scratch-agent', {
    body: { mode: 'chat', text },
  });
  if (error) return { error: 'agent_failed' };
  return data as ScratchReply | ScratchFailure;
}

const DAILY_READ_KEY = 'scratch.dailyRead'; // stores { day: 'YYYY-MM-DD', reply: string }

export async function fetchDailyRead(): Promise<{ reply: string } | null> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const cached = await AsyncStorage.getItem(DAILY_READ_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as { day: string; reply: string };
      if (parsed.day === today && parsed.reply) return { reply: parsed.reply };
    }
  } catch {
    // fall through to a fresh fetch
  }
  const { data, error } = await supabase.functions.invoke('scratch-agent', { body: { mode: 'brief' } });
  if (error || !data || typeof data.reply !== 'string') return null;
  AsyncStorage.setItem(DAILY_READ_KEY, JSON.stringify({ day: today, reply: data.reply })).catch(() => {});
  return { reply: data.reply };
}
```

- [ ] **Step 2: Write `lib/hooks/useScratch.ts`** (mirror `lib/hooks/useHabits.ts` conventions — read it first, especially its exact query keys, and use those in the invalidations):

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDailyRead, fetchScratchMessages, sendToScratch } from '../api/scratch';

export function useScratchMessages() {
  return useQuery({ queryKey: ['scratch_messages'], queryFn: fetchScratchMessages });
}

export function useSendToScratch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendToScratch,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['scratch_messages'] });
      if ('actions' in result && result.actions.length > 0) {
        // Scratch changed data — refresh everything habit-shaped.
        // VERIFY these keys against lib/hooks/useHabits.ts and match them exactly.
        queryClient.invalidateQueries({ queryKey: ['habits'] });
        queryClient.invalidateQueries({ queryKey: ['habit_logs'] });
        queryClient.invalidateQueries({ queryKey: ['relapse_incidents'] });
      }
    },
  });
}

export function useDailyRead() {
  return useQuery({
    queryKey: ['scratch_daily_read', new Date().toISOString().slice(0, 10)],
    queryFn: fetchDailyRead,
    staleTime: 1000 * 60 * 60, // the AsyncStorage day-cache is the real gate
    retry: false,
  });
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean; `npm test` 21 green.

- [ ] **Step 4: Commit**

```bash
git add lib/api/scratch.ts lib/hooks/useScratch.ts
git commit -m "feat: scratch api + hooks (chat, daily read with day cache)"
```

---

### Task 5: Wire the UI — live ChatSheet + agent Daily Read

**Files:**
- Modify: `components/scratch/ChatSheet.tsx` (substantial rewrite of its data layer; visual structure stays)
- Modify: `components/scratch/DailyReadCard.tsx`

**Interfaces:**
- Consumes: Task 4 hooks. UI contract from Project A stays: `ChatSheet({ visible, onClose })`, `DailyReadCard()` (no props).

- [ ] **Step 1: Rewire `ChatSheet.tsx`.** Keep the Modal/header/FlatList/input structure and styling exactly as-is; replace the canned-reply state machine:
  - Replace the local `messages` state + `CANNED` array with `useScratchMessages()` for history and local state only for the in-flight exchange:

```tsx
  const { data: history = [] } = useScratchMessages();
  const send = useSendToScratch();
  const [pending, setPending] = useState<{ text: string } | null>(null);
  const [lastError, setLastError] = useState<'not_configured' | 'failed' | null>(null);
  const [draft, setDraft] = useState('');
```

  - Build the FlatList data by mapping history rows to the existing `ChatMessage` shape (`{ id: row.id, role: row.role === 'user' ? 'user' : 'scratch', text: row.content }`), appending `pending` as a user bubble plus a "Scratch is reading the green…" typing bubble while `send.isPending`.
  - The send handler:

```tsx
  const onSend = () => {
    const text = draft.trim();
    if (!text || send.isPending) return;
    setDraft('');
    setLastError(null);
    setPending({ text });
    send.mutate(text, {
      onSuccess: (result) => {
        setPending(null);
        if ('error' in result) {
          setLastError(result.error === 'not_configured' ? 'not_configured' : 'failed');
        }
      },
      onError: () => {
        setPending(null);
        setLastError('failed');
      },
    });
  };
```

  - Render states, using the existing bubble styling:
    - `lastError === 'not_configured'` → a distinct setup card bubble from Scratch: `"My brain isn't hooked up yet. Add your Anthropic API key to Supabase (see DEPLOY-SCRATCH.md in the project) and I'm ready to caddie."`
    - `lastError === 'failed'` → Scratch bubble: `"Shanked that one — give it another swing."`
    - When the last reply carried actions (`send.data && 'actions' in send.data && send.data.actions.length > 0`), render one small chip row under the newest Scratch bubble: for each action string, a pill (`colors.primaryMuted` background, `typography.caption`, `colors.primary` text) reading `✓ ${action}`.
  - Keep `accessibilityLabel`s and the keyboard-avoiding layout untouched.

- [ ] **Step 2: Rewire `DailyReadCard.tsx`.** Keep the card frame, kicker, and styling; change the body source:
  - Add `const { data: agentRead, isLoading } = useDailyRead();`
  - If `agentRead?.reply`, render it as the card body (split on newlines into the existing `Text` line elements) and change the footnote to `Read by Scratch · refreshes daily`.
  - Otherwise keep the existing locally-composed lines and the existing "brain isn't connected" footnote (while `isLoading`, show the local lines — never a blank card).

- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean; `npm test` 21 green.

- [ ] **Step 4: Commit**

```bash
git add components/scratch/ChatSheet.tsx components/scratch/DailyReadCard.tsx
git commit -m "feat: live Scratch chat with action chips; agent-written daily read"
```

---

### Task 6: Docs + Tommy's deploy runbook

**Files:**
- Create: `DEPLOY-SCRATCH.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write `DEPLOY-SCRATCH.md`** — the exact, copy-pasteable human steps:

```markdown
# Turning on Scratch's brain (one-time setup)

Three things happen here: the database gets the chat-history table, Supabase
learns your Anthropic API key, and the scratch-agent function goes live.

## 0. Prerequisites
- An Anthropic API key from https://console.anthropic.com → Settings → API Keys
  (starts with `sk-ant-`). Pay-per-use; a chat costs pennies.
- The Supabase CLI: `brew install supabase/tap/supabase`

## 1. Run the migration
Open your Supabase project → SQL Editor → paste the contents of
`supabase/migrations/0003_scratch_messages.sql` → Run.
(Same way migrations 0001 and 0002 were applied.)

## 2. Link the CLI to your project (first time only)
    supabase login
    supabase link --project-ref <your-project-ref>
The project ref is in your Supabase dashboard URL:
https://supabase.com/dashboard/project/<your-project-ref>

## 3. Set the secret and deploy
    supabase secrets set ANTHROPIC_API_KEY=sk-ant-...your key...
    supabase functions deploy scratch-agent

## 4. Check it worked
Open the app → Scratch → send him a message. He should answer for real.
Ask him to check off a habit — a "✓ Checked off …" chip should appear and the
habit should show done in Recovery.

If he says his brain isn't hooked up: the secret didn't take — re-run step 3.
If he "shanks" every message: `supabase functions logs scratch-agent` shows why.
```

- [ ] **Step 2: Update `CLAUDE.md`:**
  - In **Commands**, after the migration sentence, add: `Edge functions live in supabase/functions/ (Deno; deployed with supabase functions deploy <name> — see DEPLOY-SCRATCH.md). Their index.ts files are excluded from the app tsconfig; pure logic files (e.g. scratch-agent/logic.ts) are plain TS and covered by vitest.`
  - In **Architecture**, after the Data layer bullet block, add a paragraph: `**Scratch agent** — supabase/functions/scratch-agent is a Claude tool-use loop (model constant claude-opus-4-8) over the caller's own data: the client is constructed with the caller's JWT so every read/write is RLS-scoped. Tools: upsert_habit_log, create_habit, log_relapse, list_recent_logs. Chat history persists in scratch_messages (migration 0003). The app calls it only through lib/api/scratch.ts → lib/hooks/useScratch.ts; ANTHROPIC_API_KEY exists only as an edge-function secret, and every Scratch surface degrades gracefully when it's unset.`

- [ ] **Step 3: Full verification** — `npx tsc --noEmit && npm test` (21 green); `git status` clean after commit.

- [ ] **Step 4: Commit**

```bash
git add DEPLOY-SCRATCH.md CLAUDE.md
git commit -m "docs: Scratch brain deploy runbook + CLAUDE.md architecture notes"
```

- [ ] **Step 5: Human device pass (Tommy)** — after running DEPLOY-SCRATCH.md:
1. Scratch page shows an AI-written Daily Read (footnote "Read by Scratch"); reopening the app the same day does not re-generate it.
2. Chat: real replies in caddie voice; history survives app restarts.
3. "Check off gym" → action chip appears; Recovery tab shows it done.
4. "Create a habit called stretching" → appears in Recovery.
5. Report a slip → logged, streak resets, Scratch stays kind.
6. Remove the secret temporarily (or before step 3 of the runbook): chat shows the setup card, Daily Read falls back to local lines — nothing blank or crashed.

---

## Self-Review Notes

- **Spec coverage (Project B):** edge function with JWT/RLS + tool loop + brief mode (T3), scratch_messages migration + history (T1, T3), api/hooks layering + cache invalidation after actions + daily-read day cache (T4), live chat UI with action chips + unconfigured/failed fallbacks + agent daily read with local fallback (T5), user to-dos as exact runbook (T6), pure logic unit-tested (T2).
- **Type consistency:** wire contract `{ reply, actions }`/`{ error }` matches between T3, T4, T5; `ScratchMessage` (T1) used in T4/T5; `logic.ts` exports match T3's imports.
- **Two flagged verify-points for implementers (not placeholders):** `relapse_incidents` column names (T3) and habit query keys (T4) must be read from the existing code, with concrete defaults given.
