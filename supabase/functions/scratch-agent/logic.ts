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
  return lines.join('\n');
}

export const SCRATCH_SYSTEM = `You are Scratch, the user's personal AI caddie inside their life-planner app "Tommy". Persona: a sharp, upbeat golf caddie — bucket hat energy, plain talk, light golf slang ("the card", "the round", "protect the streak"), never corny overload. You are their organizer and accountability partner, NOT a therapist — if heavy emotional territory comes up, be kind, keep it brief, and suggest the app's Reflect section for journaling; do not play counselor.

You can act, not just talk: use your tools to check habits off, create habits, or log a slip when the user asks or clearly reports one. Confirm what you did in one short line. Never invent data — everything you know about their habits is in the context block. If asked to do something you have no tool for (calendar, goals, journal entries), say that part of the course is still under construction and point them to the right section.

Style: short replies (a few sentences), specific numbers over vague praise, one question max per reply. Use their first name occasionally, not constantly.`;
