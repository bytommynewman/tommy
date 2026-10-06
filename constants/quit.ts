// Static content for the cannabis quit tracker: validated scale items,
// the withdrawal timeline, and the default toolkit seeded into the user's
// tables on quit start (see lib/api/quit.ts startQuit). Everything here is
// plain data so it can be edited without touching screens or the schema.
//
// Sources are summarized in docs/quit/RESEARCH.md.

import type { CopingToolKind, CopingToolSetting, IfThenCategory, SupportRole } from '../types/database.types';

// Cannabis Withdrawal Scale — Allsop, Norberg, Copeland, Fu & Budney (2011).
// 19 items, each rated 0 "not at all" … 10 "extremely" for the past 24 h.
// Total 0–190. The scale is free for clinical/research use.
export const CWS_ITEMS: { key: string; text: string }[] = [
  { key: 'only_think_cannabis', text: 'The only thing I could think about was smoking some cannabis' },
  { key: 'headache', text: 'I had a headache' },
  { key: 'no_appetite', text: 'I had no appetite' },
  { key: 'nauseous', text: 'I felt nauseous (like vomiting)' },
  { key: 'nervous', text: 'I felt nervous' },
  { key: 'angry_outbursts', text: 'I had some angry outbursts' },
  { key: 'mood_swings', text: 'I had mood swings' },
  { key: 'depressed', text: 'I felt depressed' },
  { key: 'irritated', text: 'I was easily irritated' },
  { key: 'imagining_stoned', text: 'I had been imagining being stoned' },
  { key: 'restless', text: 'I felt restless' },
  { key: 'woke_early', text: 'I woke up early' },
  { key: 'stomach_ache', text: 'I had a stomach ache' },
  { key: 'strange_dreams', text: 'I had nightmares and/or strange dreams' },
  { key: 'uphill_struggle', text: 'Life seemed like an uphill struggle' },
  { key: 'night_sweats', text: 'I woke up sweating at night' },
  { key: 'trouble_sleeping', text: 'I had trouble getting to sleep at night' },
  { key: 'physically_tense', text: 'I felt physically tense' },
  { key: 'hot_flashes', text: 'I had hot flashes' },
];

export const CWS_INTERFERENCE_TEXT =
  'How much did these symptoms interfere with your normal daily activities today?';

// Rough severity bands for the CWS total — not clinical cut-offs, just a
// readable label for the trend line.
export function cwsBand(total: number): 'mild' | 'moderate' | 'strong' | 'severe' {
  if (total < 40) return 'mild';
  if (total < 80) return 'moderate';
  if (total < 120) return 'strong';
  return 'severe';
}

// Withdrawal timeline for a heavy, daily, high-potency user quitting cold.
// Day 1 = the first full day without use. Ranges are inclusive. "expect"
// is written for the user, in the app's voice: plain, specific, no pep talk.
export type QuitPhase = {
  key: string;
  fromDay: number;
  toDay: number; // Infinity for the open-ended tail
  title: string;
  expect: string;
  focus: string;
};

export const QUIT_PHASES: QuitPhase[] = [
  {
    key: 'day0',
    fromDay: 0,
    toDay: 0,
    title: 'Quit day',
    expect:
      'You probably feel fine, maybe even relieved. THC is still in your system. The cart and the pen need to be gone today, not tomorrow — tonight is the first real test.',
    focus: 'Get the pen out of the house. Tell one person. Eat a real dinner.',
  },
  {
    key: 'days1_3',
    fromDay: 1,
    toDay: 3,
    title: 'Onset',
    expect:
      'Symptoms start within 24–48 h. Expect irritability, restlessness, anxiety, little appetite, trouble falling asleep, and strong cravings in the evening (your usual window). Headaches and night sweats are common. This is the window where most people cave — not because it is unbearable, but because it is annoying and the fix is one hit away.',
    focus: 'Survive the evenings. Eat on a schedule, not by appetite. Move hard once a day. Early nights.',
  },
  {
    key: 'days4_7',
    fromDay: 4,
    toDay: 7,
    title: 'Peak',
    expect:
      'Most symptoms peak around days 2–6 and then start to fade. Sleep is the worst part now: vivid, intense dreams (REM rebound), waking early, sweating. Mood can dip hard and feel like depression — this is withdrawal, not a verdict on your life. Appetite begins to return by the end of the week for most people.',
    focus: 'Protect sleep. Keep the body routine going even when the energy is not there. Do not evaluate your life this week.',
  },
  {
    key: 'week2',
    fromDay: 8,
    toDay: 14,
    title: 'Clearing',
    expect:
      'Irritability, anxiety and cravings drop noticeably for most people. Sleep is still rough and dreams are still vivid. Food starts tasting good again. The danger now is the opposite of week one: you feel better, so "one hit" seems harmless. Day 10–14 is a classic relapse point.',
    focus: 'Back at school: new routines in the old places. Pre-decide every night out.',
  },
  {
    key: 'weeks3_4',
    fromDay: 15,
    toDay: 30,
    title: 'Settling',
    expect:
      'Physical symptoms are mostly gone. Sleep and dreams normalize gradually (can take 4–6 weeks). Energy and motivation come back in steps, not a straight line. Cravings are now mostly situational — specific people, places, songs, late nights.',
    focus: 'Rebuild the things weed was covering: eating, gym, boredom tolerance. Notice what actually feels better.',
  },
  {
    key: 'month2_3',
    fromDay: 31,
    toDay: 90,
    title: 'New baseline',
    expect:
      'Most ex-heavy users say this is when the fog fully lifts: memory, attention and mood are measurably better than at day 30. Occasional cravings still show up, usually tied to stress or a drink. They pass in minutes.',
    focus: 'This is where the clean time starts paying out. Keep logging the odd craving so you can see how rare they got.',
  },
  {
    key: 'beyond',
    fromDay: 91,
    toDay: Infinity,
    title: 'Clear',
    expect: 'You are past the part anyone studies. The habit is a thing you used to do.',
    focus: 'Keep the toolkit; it works on more than weed.',
  },
];

export function phaseForDay(day: number): QuitPhase {
  const d = Math.max(0, Math.floor(day));
  return QUIT_PHASES.find((p) => d >= p.fromDay && d <= p.toDay) ?? QUIT_PHASES[QUIT_PHASES.length - 1];
}

// Daily check-in scale labels (0–10).
export const CHECKIN_SCALES: { key: CheckinScaleKey; label: string; low: string; high: string }[] = [
  { key: 'sleep_quality', label: 'Sleep', low: 'awful', high: 'great' },
  { key: 'appetite', label: 'Appetite', low: 'none', high: 'normal' },
  { key: 'mood', label: 'Mood', low: 'low', high: 'good' },
  { key: 'anxiety', label: 'Anxiety', low: 'calm', high: 'wired' },
  { key: 'irritability', label: 'Irritability', low: 'chill', high: 'snappy' },
  { key: 'energy', label: 'Energy', low: 'flat', high: 'full' },
  { key: 'craving_peak', label: 'Worst craving', low: 'none', high: 'brutal' },
];
export type CheckinScaleKey =
  | 'sleep_quality' | 'appetite' | 'mood' | 'anxiety' | 'irritability' | 'energy' | 'craving_peak';

export const CHECKIN_FLAGS: { key: CheckinFlagKey; label: string }[] = [
  { key: 'vivid_dreams', label: 'vivid dreams' },
  { key: 'night_sweats', label: 'night sweats' },
  { key: 'headache', label: 'headache' },
  { key: 'nausea', label: 'nausea' },
];
export type CheckinFlagKey = 'vivid_dreams' | 'night_sweats' | 'headache' | 'nausea';

export const CHECKIN_BEHAVIOURS: { key: CheckinBehaviourKey; label: string }[] = [
  { key: 'ate_breakfast', label: 'ate breakfast' },
  { key: 'worked_out', label: 'worked out' },
  { key: 'got_outside', label: 'got outside' },
];
export type CheckinBehaviourKey = 'ate_breakfast' | 'worked_out' | 'got_outside';

export const NICOTINE_LEVELS = ['none', 'light', 'usual', 'heavy'] as const;

// Craving triggers — Tommy's actual ones, not a generic list.
export const CRAVING_TRIGGERS = [
  'bored',
  'anxious',
  "can't sleep",
  "can't eat",
  'after the gym',
  'pre-drinks',
  'at the bar',
  'drunk',
  'friends smoking',
  'the ex',
  'bad news',
  'schoolwork',
  'late night alone',
  'music',
  'habit / autopilot',
  'nicotine hit wanted',
] as const;

// Default toolkit, seeded on quit start. kind: move | body | mind | social | swap | build.
export type CopingToolSeed = {
  name: string;
  kind: CopingToolKind;
  instructions: string;
  minutes: number;
  setting: CopingToolSetting;
};

export const DEFAULT_COPING_TOOLS: CopingToolSeed[] = [
  {
    name: 'Walk it off',
    kind: 'move',
    minutes: 15,
    setting: 'anywhere',
    instructions:
      'Shoes on, out the door, no destination. Cravings peak and fade in 10–30 minutes whether or not you act on them. Put a song on; the urge will be smaller by the end of the walk than at the door.',
  },
  {
    name: 'Hard set',
    kind: 'move',
    minutes: 20,
    setting: 'home',
    instructions:
      'Push-ups, squats, lunges, planks to failure, 20 minutes. Exercise measurably cuts cannabis cravings and helps sleep that night. You do not need motivation, you need the first set.',
  },
  {
    name: 'Cold shower / face in ice water',
    kind: 'body',
    minutes: 3,
    setting: 'home',
    instructions:
      'Cold water on the face or a 60–90 second cold shower triggers the dive reflex and drops heart rate and arousal fast. Good for the wired, anxious cravings.',
  },
  {
    name: 'Hot shower',
    kind: 'body',
    minutes: 10,
    setting: 'home',
    instructions:
      'The r/leaves classic for nausea, sweats and restlessness. Also a hard reset on the "I need to do something right now" feeling.',
  },
  {
    name: 'Eat something',
    kind: 'body',
    minutes: 10,
    setting: 'anywhere',
    instructions:
      'Hunger reads as craving and irritability. If it has been more than 3–4 h since food, eat first, then reassess. Liquid calories count: shake, smoothie, chocolate milk.',
  },
  {
    name: 'Urge surf',
    kind: 'mind',
    minutes: 10,
    setting: 'anywhere',
    instructions:
      'Sit. Find where the craving lives in your body (chest, jaw, hands). Rate it 0–10. Breathe slowly and watch it like a wave — it rises, crests, falls. Rate it again at 5 minutes and 10 minutes. You are not fighting it, you are timing it.',
  },
  {
    name: 'Play the tape forward',
    kind: 'mind',
    minutes: 3,
    setting: 'anywhere',
    instructions:
      'Do not stop at the hit. Picture the whole night: the second and third hit, the no-appetite tomorrow, the white tongue, the "why did I do that" at 2 pm, re-starting day 1. Then open this app and read your reasons.',
  },
  {
    name: 'Text someone who knows',
    kind: 'social',
    minutes: 5,
    setting: 'anywhere',
    instructions:
      'Not for a pep talk. Just "craving, day N, riding it out". Saying it out loud to one person takes most of the charge out of it. Your support contacts are in the app.',
  },
  {
    name: 'Leave the room',
    kind: 'social',
    minutes: 5,
    setting: 'out',
    instructions:
      'If people are smoking: bathroom, outside, go get food, go home. Nobody will remember you left. Everybody would remember if you hit it.',
  },
  {
    name: 'Mouth and hands',
    kind: 'swap',
    minutes: 5,
    setting: 'anywhere',
    instructions:
      'The inhale ritual is half the habit. Gum, sunflower seeds, ice water with a straw, a toothpick. Brush your teeth — a clean mouth also kills the "bad taste" that used to send you to the pen.',
  },
  {
    name: 'Sleep kit',
    kind: 'body',
    minutes: 30,
    setting: 'home',
    instructions:
      'Weed at night is the hardest one to replace. Fixed wake time, no screens in bed, room cold, magnesium if you take it, lemborexant as prescribed (with a snack, not on an empty stomach, and never with alcohol). If not asleep in 20 min, get up and sit somewhere dim until you are actually sleepy. Vivid dreams are REM rebound and mean your brain is repairing sleep.',
  },
  {
    name: 'Work on holdr',
    kind: 'build',
    minutes: 30,
    setting: 'home',
    instructions:
      'You need motion. Use it. Thirty focused minutes on the one thing that is completely yours — content, outreach, the site. Progress you can see beats any high.',
  },
  {
    name: 'Journal one line',
    kind: 'mind',
    minutes: 2,
    setting: 'anywhere',
    instructions:
      'Open Reflect and write exactly what the craving is saying, in its own words ("you deserve it", "just tonight", "you will not sleep"). Written down, it is a lot less convincing.',
  },
];

export type IfThenSeed = { situation: string; response: string; category: IfThenCategory };

// If-then plans, seeded on quit start. Pre-decided, so there is nothing to
// decide in the moment.
export const DEFAULT_IF_THEN_PLANS: IfThenSeed[] = [
  {
    category: 'home',
    situation: 'It is 10 pm and I cannot settle',
    response: 'Hot shower, phone in another room, 20 min of something dumb on TV, bed by 11. Dreams will be weird. That is the plan working.',
  },
  {
    category: 'food',
    situation: 'I have no appetite',
    response: 'Eat by the clock, not by hunger: something at 9, 1, 5 and 9. A shake counts. Appetite comes back around day 5–7 whether I wait for it or not.',
  },
  {
    category: 'night_out',
    situation: 'I am going to Delilah\'s or a bar this week',
    response: 'Decide the drink count before I leave (max 3 in the first month), eat a real dinner first, no pre-drink to "calm down", and have a leave-by time. Cravings spike after drinks; I am gone before that window.',
  },
  {
    category: 'alcohol',
    situation: 'I feel like I need to drink before going out to not be anxious',
    response: 'That is the anxiety, not the night. Delay the first drink until I am physically at the venue. Text one friend I will be there. If I still need a drink to walk in, I skip tonight — there will be more nights.',
  },
  {
    category: 'social',
    situation: 'Someone passes a pen or a joint',
    response: '"I\'m off it for a bit." That is the whole sentence. No explanation, no story. Then go get a water.',
  },
  {
    category: 'nicotine',
    situation: 'I want the inhale, not the high',
    response: 'Nicotine stays for now — one problem at a time. But I do not buy a new vape when this one dies for the next 30 days, and I note the nicotine level on the daily check-in so I can see it.',
  },
  {
    category: 'ex',
    situation: 'I want to text her',
    response: 'Not tonight, not during withdrawal. Everything is 30% louder right now. Write the text in Reflect instead. Re-read it in the morning.',
  },
  {
    category: 'mood',
    situation: 'I feel depressed and like none of this is worth it',
    response: 'Days 3–10 feel like this for most heavy users; it is chemistry, not a conclusion. Eat, go outside for 20 min, text Mom or Dad or Sunil. If it includes thoughts of hurting myself, I call 988 — no deliberation.',
  },
  {
    category: 'general',
    situation: 'I slip and take a hit',
    response: 'One hit is a slip, not a reset of who I am. Log it honestly, do not turn it into a night. Tomorrow is still a clean day. The data is what I actually care about.',
  },
  {
    category: 'sleep',
    situation: 'I wake up at 4 am sweating and cannot get back to sleep',
    response: 'Change the shirt, drink water, do not check the clock again. If not asleep in 20 min, read something boring in dim light. Nap max 20 min the next day, before 3 pm.',
  },
  {
    category: 'general',
    situation: 'I am back in London and walk into my room where I used to smoke',
    response: 'Rearrange one thing before I unpack. Bin the stash spot. The room needs to look different enough that autopilot does not fire.',
  },
];

export type MilestoneSeed = { day: number; title: string; what_to_expect: string; reward_hint: string };

// Rewards are the user's to fill in; hints are there so the field is never
// blank and the contract gets made at the start, not improvised later.
export const DEFAULT_MILESTONES: MilestoneSeed[] = [
  { day: 1, title: 'First full day', what_to_expect: 'Mostly fine. The evening is the test.', reward_hint: 'order the good dinner' },
  { day: 3, title: 'Through the worst evenings', what_to_expect: 'Peak irritability and worst sleep so far.', reward_hint: 'new song / a round of golf with Dad' },
  { day: 7, title: 'One week', what_to_expect: 'Appetite starting back. Dreams still wild.', reward_hint: 'something for holdr (a tool, an ad budget)' },
  { day: 14, title: 'Two weeks', what_to_expect: 'Cravings mostly situational now. Classic relapse window — stay sharp.', reward_hint: 'the dinner out you would normally spend on a cart' },
  { day: 30, title: 'One month', what_to_expect: 'Sleep normalizing. Energy back in steps.', reward_hint: 'spend the money saved on something you can hold' },
  { day: 60, title: 'Two months', what_to_expect: 'Fog gone for most people. Memory and focus noticeably better.', reward_hint: 'a trip or a big night done sober-ish' },
  { day: 90, title: 'Three months', what_to_expect: 'Past the part anyone studies.', reward_hint: 'your call — you earned the whole thing' },
];

export type SupportSeed = {
  name: string;
  role: SupportRole;
  phone: string | null;
  text_ok: boolean;
  late_night_ok: boolean;
  knows: 'full' | 'partial' | 'none';
  notes: string | null;
};

// Phone numbers for named people are left blank on purpose; crisis lines are public.
export const DEFAULT_SUPPORT_CONTACTS: SupportSeed[] = [
  { name: 'Mom', role: 'parent', phone: null, text_ok: true, late_night_ok: true, knows: 'none', notes: 'Tell her the plan on Thursday. Ask for one thing: dinner together every night this week.' },
  { name: 'Dad', role: 'parent', phone: null, text_ok: true, late_night_ok: true, knows: 'none', notes: 'Golf, gym, drive. He does not need the whole story to be useful.' },
  { name: 'Sunil (therapist)', role: 'therapist', phone: null, text_ok: false, late_night_ok: false, knows: 'partial', notes: 'Book a session for week 1 and week 2. Bring the check-in data.' },
  { name: 'Family doctor', role: 'doctor', phone: null, text_ok: false, late_night_ok: false, knows: 'none', notes: 'Flag the quit, the venlafaxine reduction, iron, appetite. Do not change med doses during withdrawal without them.' },
  { name: '988 Suicide Crisis Helpline', role: 'crisis_line', phone: '988', text_ok: true, late_night_ok: true, knows: 'none', notes: 'Call or text, 24/7, Canada-wide.' },
  { name: 'Reach Out (London–Middlesex)', role: 'crisis_line', phone: '519-433-2023', text_ok: false, late_night_ok: true, knows: 'none', notes: '24/7 mental health & addictions line for London, ON. Toll-free 1-866-933-2023.' },
  { name: 'ConnexOntario', role: 'crisis_line', phone: '1-866-531-2600', text_ok: false, late_night_ok: true, knows: 'none', notes: '24/7 Ontario addiction & mental health service navigation.' },
];

// Live-resin 1 g carts in Ontario run roughly $45–70 CAD retail; one every
// ~72 h is ~2.3 carts a week. Default to the low end so the number is honest.
export const DEFAULT_CART_COST_CENTS = 5000;
export const DEFAULT_CARTS_PER_WEEK = 7 / 3;
export const DEFAULT_WEEKLY_COST_CENTS = Math.round(DEFAULT_CART_COST_CENTS * DEFAULT_CARTS_PER_WEEK);
