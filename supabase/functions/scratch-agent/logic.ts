// Pure logic for the scratch-agent edge function. No Deno or npm-specifier
// imports here — this file is unit-tested with vitest from the app repo.

export type QuitContext = {
  attemptId: string;
  habitId: string | null;
  day: number; // calendar days since the quit started (day 0 = quit day)
  phase: string; // e.g. "Peak (days 4–7)"
  checkedInToday: boolean;
  cravingsToday: number;
  cravingsPassedTotal: number;
  cravingsTotal: number;
  reasons: string[];
};

export type ScratchContext = {
  firstName: string;
  today: string; // YYYY-MM-DD
  habits: { id: string; name: string; kind: string; daysClean: number | null }[];
  doneToday: string[];
  remainingToday: string[];
  quit?: QuitContext | null;
};

// Mirrors constants/quit.ts QUIT_PHASES titles — kept inline so this file
// stays free of app imports (it is vendored into the Deno function).
export function quitPhaseLabel(day: number): string {
  if (day <= 0) return 'Quit day (day 0)';
  if (day <= 3) return 'Onset (days 1–3): irritability, restlessness, no appetite, hard evenings';
  if (day <= 7) return 'Peak (days 4–7): worst sleep, vivid dreams, mood dips; appetite starting back';
  if (day <= 14) return 'Clearing (week 2): symptoms fading; classic "one hit won\'t hurt" relapse window';
  if (day <= 30) return 'Settling (weeks 3–4): physical symptoms gone, sleep normalizing, cravings situational';
  if (day <= 90) return 'New baseline (months 2–3): fog lifting, occasional cravings';
  return 'Clear (90+ days)';
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Mirrors lib/streaks.ts daysClean semantics (local calendar days on the
// user's device): tzOffsetMinutes is the device's Date.getTimezoneOffset()
// (minutes behind UTC, positive in the Americas). Days are counted as
// local-calendar-day boundaries crossed since the later of habit creation
// and the most recent relapse. A fixed offset ignores DST transitions inside
// the window — off by at most an hour's boundary shift, acceptable here.
export function daysCleanFrom(
  createdAt: string,
  relapseTimes: string[],
  tzOffsetMinutes = 0,
  now: Date = new Date()
): number {
  let since = new Date(createdAt).getTime();
  for (const t of relapseTimes) {
    const ms = new Date(t).getTime();
    if (ms > since) since = ms;
  }
  const localDayIndex = (ms: number) => Math.floor((ms - tzOffsetMinutes * 60_000) / DAY_MS);
  const days = localDayIndex(now.getTime()) - localDayIndex(since);
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
  if (ctx.quit) {
    const q = ctx.quit;
    lines.push('');
    lines.push(`QUITTING WEED — active quit (attempt id ${q.attemptId}${q.habitId ? `, habit id ${q.habitId}` : ''}).`);
    lines.push(`Day ${q.day} since the last hit. Where they are: ${q.phase}.`);
    lines.push(
      `Daily check-in today: ${q.checkedInToday ? 'done' : 'NOT done yet — a gentle nudge is welcome in the evening'}. Cravings logged today: ${q.cravingsToday}.`
    );
    if (q.cravingsTotal > 0) {
      lines.push(`Cravings ridden out so far: ${q.cravingsPassedTotal} of ${q.cravingsTotal}.`);
    }
    if (q.reasons.length > 0) lines.push(`Their own reasons for quitting: ${q.reasons.join('; ')}.`);
    lines.push(
      'Quit guidance: cravings peak and fade in ~10–30 min; HALT check (hungry/angry/lonely/tired) first; a slip is a slip, not a reset of who they are; alcohol is the documented path back to a hit; do not change prescription doses mid-withdrawal — that is for their prescriber.'
    );
  }
  return lines.join('\n');
}

export const SCRATCH_SYSTEM = `You are Scratch, the user's personal AI caddie inside their life-planner app "Tommy". Persona: a sharp, upbeat golf caddie — bucket hat energy, plain talk, light golf slang ("the card", "the round", "protect the streak"), never corny overload. You are their organizer and accountability partner, NOT a therapist — if heavy emotional territory comes up, be kind, keep it brief, and suggest the app's Reflect section for journaling; do not play counselor.

You can act, not just talk: use your tools to check habits off, create habits, log a slip, log a craving (log_craving) when the user says they are craving or just rode one out, or save a quick quit check-in (quick_checkin) when they report how the day went. When a craving is live, lead with one concrete move (walk, cold water, eat, text someone) and the fact that it passes in 10–30 minutes — then log it. If a QUITTING WEED block is in the context, you know the day number and phase: use them. Confirm what you did in one short line. Never invent data — everything you know about their habits is in the context block. If asked to do something you have no tool for (calendar, goals, journal entries), say that part of the course is still under construction and point them to the right section.

Style: short replies (a few sentences), specific numbers over vague praise, one question max per reply. Use their first name occasionally, not constantly.`;
