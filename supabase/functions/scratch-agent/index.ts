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
    const tzOffsetMinutes = Number.isFinite(Number(body.tz_offset_minutes)) ? Number(body.tz_offset_minutes) : 0;
    const clientToday =
      typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : undefined;
    const context = await loadContext(supabase, clientToday, tzOffsetMinutes);
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
      // A previously failed request can leave an orphan user row with no matching
      // assistant reply; if the fetched window then starts on an assistant row (odd
      // parity), the Anthropic API 400s because the first message must be from 'user'.
      while (history.length > 0 && history[0].role === 'assistant') history.shift();

      const { error: userInsertError } = await supabase.from('scratch_messages').insert({ role: 'user', content: userText });
      if (userInsertError) console.error('scratch_messages insert failed', userInsertError.message);

      const { reply, actions } = await runAgentLoop(anthropic, supabase, system, [
        ...history,
        { role: 'user', content: userText },
      ]);

      const { error: assistantInsertError } = await supabase.from('scratch_messages').insert({ role: 'assistant', content: reply });
      if (assistantInsertError) console.error('scratch_messages insert failed', assistantInsertError.message);
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
async function loadContext(supabase: any, todayOverride?: string, tzOffsetMinutes = 0): Promise<ScratchContext> {
  const today = todayOverride ?? new Date().toISOString().slice(0, 10);
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
                .map((r: { occurred_at: string }) => r.occurred_at),
              tzOffsetMinutes
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
      const { data: habit } = await supabase.from('habits').select('name').eq('id', input.habit_id).maybeSingle();
      const { error } = await supabase
        .from('habit_logs')
        .upsert(
          { habit_id: input.habit_id, log_date: input.log_date, status: input.status },
          { onConflict: 'habit_id,log_date' }
        );
      if (error) throw new Error(error.message);
      return {
        result: `Logged ${input.status} for ${input.log_date}.`,
        summary: `${input.status === 'done' ? 'Checked off' : 'Marked skipped'} ${habit?.name ?? 'a habit'} for ${input.log_date}`,
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
        .insert({ habit_id: input.habit_id, notes: (input.note as string) ?? null });
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
