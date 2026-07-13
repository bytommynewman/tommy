import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const MODEL = 'claude-sonnet-5'; // the one sanctioned cost/quality knob

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

// Tommy's niche, from the approved spec — the lens every idea looks through.
const NICHE = `Tommy is a creator documenting his come-up: day-in-the-life vlogs,
building his own AI-powered life app with Claude (an AI assistant), his investing
journey, habit/recovery self-improvement, and cool cinematic edits of himself.
Platform: Instagram Reels. Voice: ambitious, real, a little funny — never
corporate. Every idea must be filmable by one person with a phone.`;

const IDEAS_SYSTEM = `You generate Instagram Reel concepts. Reply with STRICT JSON only —
an array of exactly 5 objects, each {"title": string, "hook": string, "outline": string,
"format": string}. "hook" is the first line viewers hear/see (make it stop thumbs).
"outline" is 3 short beats separated by newlines, then a FINAL line exactly of the form
"film it like: <one-line description of a well-known reel style/example to copy, concrete
enough to search for>". "format" is a 2-4 word style tag (e.g. "talking head",
"b-roll montage", "screen recording"). Vary the formats across the 5 ideas. No markdown,
no fences, no commentary — JSON array only.`;

const PLAN_SYSTEM = `You are an expert short-form video edit director. Reply with STRICT
JSON only: {"shot_list": [{"shot": string, "note": string}], "beats": [{"start": number,
"end": number, "description": string}], "caption": string, "hashtags": string, "music": string}.
shot_list: 4-8 concrete shots one person can film on a phone. beats: the full cut of a
20-40 second reel, seconds as numbers, covering hook to CTA. caption: 1-2 punchy lines,
first person. hashtags: 15-20 space-separated tags mixing niche sizes. music: one line
describing the track vibe/tempo to search for. No markdown, no fences — JSON only.`;

const DIRECTOR_SYSTEM = `You are the edit director working over an existing reel edit plan.
The user tells you what to change (pace, tone, cut order, caption, anything). Reply with
STRICT JSON only: {"reply": string, "plan": object | null}. "reply" is your short spoken
answer (2-3 sentences, direct, a director on set). "plan" carries ONLY the fields you
changed, from: shot_list [{"shot","note"}], beats [{"start","end","description"}] (seconds
as numbers), caption (string), hashtags (string), music (string) — or null if you changed
nothing. Never invent fields. No markdown, no fences — JSON only.`;

const MAX_IDEAS = 8;

function stripFences(raw: string): string {
  return raw.replace(/```(?:json)?/gi, '').trim();
}
function nonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}
// Mirrors lib/contentLogic.ts parseIdeas — edge files live outside the app
// tsconfig, so the validator is duplicated here by design (keep in sync).
function validateIdeas(raw: string): { title: string; hook: string; outline: string; format: string }[] | null {
  let data: unknown;
  try {
    data = JSON.parse(stripFences(raw));
  } catch {
    return null;
  }
  if (!Array.isArray(data) || data.length === 0) return null;
  const out: { title: string; hook: string; outline: string; format: string }[] = [];
  for (const item of data.slice(0, MAX_IDEAS)) {
    const r = item as Record<string, unknown>;
    if (!nonEmpty(r.title) || !nonEmpty(r.hook) || !nonEmpty(r.outline) || !nonEmpty(r.format)) return null;
    out.push({ title: r.title, hook: r.hook, outline: r.outline, format: r.format });
  }
  return out;
}
// Mirrors lib/contentLogic.ts parseEditPlan (same keep-in-sync contract).
function validatePlan(raw: string):
  | {
      shot_list: { shot: string; note: string }[];
      beats: { start: number; end: number; description: string }[];
      caption: string;
      hashtags: string;
      music: string;
    }
  | null {
  let data: unknown;
  try {
    data = JSON.parse(stripFences(raw));
  } catch {
    return null;
  }
  const rec = data as Record<string, unknown>;
  if (!rec || typeof rec !== 'object' || !Array.isArray(rec.shot_list) || !Array.isArray(rec.beats)) return null;
  for (const s of rec.shot_list as Record<string, unknown>[]) {
    if (!nonEmpty(s.shot) || typeof s.note !== 'string') return null;
  }
  for (const b of rec.beats as Record<string, unknown>[]) {
    if (typeof b.start !== 'number' || typeof b.end !== 'number' || !nonEmpty(b.description)) return null;
  }
  if (typeof rec.caption !== 'string' || typeof rec.hashtags !== 'string' || typeof rec.music !== 'string') return null;
  return {
    shot_list: rec.shot_list as { shot: string; note: string }[],
    beats: rec.beats as { start: number; end: number; description: string }[],
    caption: rec.caption,
    hashtags: rec.hashtags,
    music: rec.music,
  };
}

// Mirrors lib/contentLogic.ts parseDirector (same keep-in-sync contract).
function validateDirector(raw: string):
  | { reply: string; plan: Record<string, unknown> | null }
  | null {
  let data: unknown;
  try {
    data = JSON.parse(stripFences(raw));
  } catch {
    return null;
  }
  const rec = data as Record<string, unknown>;
  if (!rec || typeof rec !== 'object' || !nonEmpty(rec.reply)) return null;
  if (rec.plan === null || rec.plan === undefined) return { reply: rec.reply, plan: null };
  const p = rec.plan as Record<string, unknown>;
  if (typeof p !== 'object') return null;
  const plan: Record<string, unknown> = {};
  if (p.shot_list !== undefined) {
    if (!Array.isArray(p.shot_list)) return null;
    for (const s of p.shot_list as Record<string, unknown>[]) {
      if (!nonEmpty(s.shot) || typeof s.note !== 'string') return null;
    }
    plan.shot_list = p.shot_list;
  }
  if (p.beats !== undefined) {
    if (!Array.isArray(p.beats)) return null;
    for (const b of p.beats as Record<string, unknown>[]) {
      if (typeof b.start !== 'number' || typeof b.end !== 'number' || !nonEmpty(b.description)) return null;
    }
    plan.beats = p.beats;
  }
  for (const key of ['caption', 'hashtags', 'music']) {
    if (p[key] !== undefined) {
      if (typeof p[key] !== 'string') return null;
      plan[key] = p[key];
    }
  }
  return { reply: rec.reply, plan: Object.keys(plan).length > 0 ? plan : null };
}

function textOf(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

// deno-lint-ignore no-explicit-any
async function buildContext(supabase: any, today: string): Promise<string> {
  const [{ data: habits }, { data: logs }, { data: snaps }, { data: recent }] = await Promise.all([
    supabase.from('habits').select('name, kind'),
    supabase.from('habit_logs').select('habit_id, status').eq('log_date', today),
    supabase.from('ig_snapshots').select('followers, captured_at').order('captured_at', { ascending: false }).limit(1),
    supabase.from('reel_ideas').select('title').order('created_at', { ascending: false }).limit(10),
  ]);
  const lines: string[] = [NICHE];
  if (habits?.length) {
    lines.push(`Current habits: ${habits.map((h: { name: string }) => h.name).join(', ')}.`);
    lines.push(`Habits checked off today: ${logs?.length ?? 0}.`);
  }
  if (snaps?.[0]) lines.push(`Instagram followers right now: ${snaps[0].followers}.`);
  if (recent?.length) {
    lines.push(`Ideas already generated (do NOT repeat these angles): ${recent.map((r: { title: string }) => r.title).join(' | ')}.`);
  }
  lines.push(`Today's date: ${today}.`);
  return lines.join('\n');
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
    const today =
      typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
        ? body.today
        : new Date().toISOString().slice(0, 10);

    if (body.mode === 'ideas') {
      const context = await buildContext(supabase, today);
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: `${IDEAS_SYSTEM}\n\n<creator_context>\n${context}\n</creator_context>`,
        messages: [{ role: 'user', content: 'Generate 5 fresh Reel ideas for me today.' }],
      });
      const ideas = validateIdeas(textOf(response));
      if (!ideas) return json({ error: 'agent_failed' }, 500);
      const { data: inserted, error } = await supabase
        .from('reel_ideas')
        .insert(ideas.map((i) => ({ ...i, status: 'new' })))
        .select('*');
      if (error) return json({ error: 'agent_failed' }, 500);
      return json({ ideas: inserted });
    }

    if (body.mode === 'edit_plan' && typeof body.idea_id === 'string') {
      const { data: idea } = await supabase.from('reel_ideas').select('*').eq('id', body.idea_id).maybeSingle();
      if (!idea) return json({ error: 'bad_request' }, 400);
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: `${PLAN_SYSTEM}\n\n<creator_context>\n${NICHE}\n</creator_context>`,
        messages: [
          {
            role: 'user',
            content: `Build the full edit for this Reel idea.\nTitle: ${idea.title}\nHook: ${idea.hook}\nOutline:\n${idea.outline}\nFormat: ${idea.format}`,
          },
        ],
      });
      const plan = validatePlan(textOf(response));
      if (!plan) return json({ error: 'agent_failed' }, 500);
      const { data: inserted, error } = await supabase
        .from('edit_plans')
        .insert({ idea_id: idea.id, ...plan })
        .select('*')
        .single();
      if (error) return json({ error: 'agent_failed' }, 500);
      return json({ plan: inserted });
    }

    if (body.mode === 'director' && typeof body.plan_id === 'string' && nonEmpty(body.message)) {
      const { data: plan } = await supabase.from('edit_plans').select('*').eq('id', body.plan_id).maybeSingle();
      if (!plan) return json({ error: 'bad_request' }, 400);
      const { data: idea } = await supabase.from('reel_ideas').select('*').eq('id', plan.idea_id).maybeSingle();
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: `${DIRECTOR_SYSTEM}\n\n<creator_context>\n${NICHE}\n</creator_context>`,
        messages: [
          {
            role: 'user',
            content: `Current edit plan (JSON):\n${JSON.stringify({
              shot_list: plan.shot_list,
              beats: plan.beats,
              caption: plan.caption,
              hashtags: plan.hashtags,
              music: plan.music,
            })}\n\nReel: ${idea ? `${idea.title} — hook: ${idea.hook}` : 'unknown'}\n\nDirection from the creator: ${body.message.slice(0, 600)}`,
          },
        ],
      });
      const out = validateDirector(textOf(response));
      if (!out) return json({ error: 'agent_failed' }, 500);
      if (out.plan) {
        const { data: updated, error } = await supabase
          .from('edit_plans')
          .update(out.plan)
          .eq('id', plan.id)
          .select('*')
          .single();
        if (error) return json({ error: 'agent_failed' }, 500);
        return json({ reply: out.reply, plan: updated });
      }
      return json({ reply: out.reply, plan: null });
    }

    return json({ error: 'bad_request' }, 400);
  } catch (err) {
    console.error('content-agent error', err);
    return json({ error: 'agent_failed' }, 500);
  }
});
