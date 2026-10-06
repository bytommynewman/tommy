# Cannabis withdrawal — research notes

Compiled Oct 6, 2026 for the quit tracker (migration 0011, `constants/quit.ts`,
`lib/quitLogic.ts`). Four research passes: clinical literature, ex-user
communities, medication/body interactions, behaviour-change and tracker design.
Note on sourcing: the research environment could only read search-engine
extracts of most primary sources, not full text. Numbers are quoted as surfaced;
anything marked *verify* should be checked against the linked paper before being
quoted as fact.

## 1. The syndrome

- **DSM-5 cannabis withdrawal** (Hasin 2013): after heavy, prolonged use, 3+ of
  irritability/anger, anxiety, sleep difficulty (incl. disturbing dreams),
  decreased appetite/weight loss, restlessness, depressed mood, and at least
  one physical symptom (abdominal pain, shakiness, sweating, fever/chills,
  headache), within ~1 week, causing distress or impairment.
- **Prevalence** (Bahji 2020, JAMA Netw Open; 47 studies, n=23,518): 47% pooled;
  87% in inpatient, 54% outpatient, 17% population samples. Higher with daily
  use, tobacco co-use and other substance use. Tommy has all three risk markers.
- **Most consistent symptoms** (Budney 2004 review): anxiety, decreased
  appetite/weight loss, irritability, restlessness, sleep problems, strange
  dreams (≥70% of studies). Less consistent: aggression, stomach pain,
  sweating, shakiness, chills, headache. Sleep difficulty endorsed by 67–73% of
  adults in quit attempts.
- **Timeline** (Budney & Hughes 2003; Connor 2022, Addiction): onset 24–48 h;
  peak days 2–6; most symptoms resolve in 4–14 days; irritability has later
  onset and longer tail; sleep disturbance and vivid dreams up to ~45 days
  (REM rebound). Allsop 2012: angry outbursts and trouble getting to sleep were
  the most intense and distressing items; physical tension and sleep problems
  predicted relapse more than fatigue or appetite loss; withdrawal-related
  impairment predicted use in the following month.
- **Concentrates / high potency**: Freeman & Winstock 2015 (high-potency use →
  higher dependence severity, stronger in younger users); Hines 2020 (JAMA
  Psychiatry; aOR 4.08 for cannabis problems, 1.92 for anxiety disorder);
  Petrilli 2022 Lancet Psychiatry review; Loflin & Earleywine 2014 (dab users
  self-report higher tolerance and more withdrawal); Bidwell 2020 (concentrate
  users reach ~2× blood THC for the same subjective high). No controlled study
  of withdrawal *duration* by product type exists; the "long end of every
  timeline" framing in PLAN.md is an extrapolation from dependence severity and
  self-report. A 1 g ~85% cart per 48–72 h ≈ 280–425 mg THC/day.
- **Safety**: not medically dangerous (no seizures/delirium). Escalate for
  worsening depression or suicidal ideation (baseline risk already elevated),
  new psychotic symptoms (Chesney 2024: rare but documented after abrupt
  cessation in daily users), cannabinoid hyperemesis (cyclic vomiting, relief
  with hot showers), ongoing weight loss in an already-underweight person, or
  3+ nights without sleep.

## 2. Validated instruments used in the app

- **Cannabis Withdrawal Scale** (Allsop et al. 2011, Drug Alcohol Depend
  119:123–129). 19 items, past 24 h, 0 "not at all" – 10 "extremely", plus a
  negative-impact rating. Free for clinical/research use (distributed by
  Australian government AOD sites). Items are in `CWS_ITEMS`; the exact order
  of six items (restless, woke early, strange dreams, sweating, physically
  tense, hot flashes) is *verify* against the Flinders/Queensland Health PDF —
  the app stores items by key, so order does not affect scoring.
- **Daily subset** rather than the full scale: the app's seven 0–10 scales
  (sleep, appetite, mood, anxiety, irritability, energy, worst craving) plus
  four physical flags cover the DSM-5 cluster in under a minute; the full CWS
  is behind a disclosure for weekly use. This follows EMA compliance data
  (compliance drops after day 5 and is lowest in the early morning; evening,
  one screen, under 60 s).
- **Not embedded**: Insomnia Severity Index (licensed by Mapi for digital
  products); the app uses hours slept + 0–10 quality + a vivid-dreams flag.
  MCQ-SF (NIDA; 12 items, 4 factors) and CUDIT-R (8 items; ≥8 hazardous, ≥12
  possible CUD) are free and could be added as a baseline/day-90 pair.

## 3. What works (treatment evidence)

- **Psychosocial** (Gates 2016 Cochrane; 23 RCTs): CBT and MET most consistent;
  best results from >4 sessions over >1 month, especially MET+CBT; adding
  **contingency management** (rewards for verified abstinence) improves
  outcomes. CM for CUD specifically: Lima 2024 meta-analysis (16 studies,
  moderate-to-high quality evidence). CM effects fade when incentives stop, so
  the milestone rewards run through day 90.
- **Implementation intentions** ("if X then Y"): Gollwitzer & Sheeran 2006
  (94 studies, d=0.65); McWilliams 2019 smoking meta-analysis (quit rate 10.7%
  vs 4.9%). Encoded as `if_then_plans`, seeded with Tommy's known situations
  and surfaced in the craving flow when a trigger matches.
- **Urge surfing / mindfulness-based relapse prevention** (Bowen 2014, JAMA
  Psychiatry, n=286: ~31% fewer drug-use days at 12 months vs standard RP).
  "10–30 minutes" is clinical rule of thumb, not a measured EMA fact. The
  craving screen rates → times → re-rates so the user generates their own data.
- **Relapse prevention** (Marlatt & Gordon): the abstinence violation effect
  ("I've already ruined it") is the mechanism that turns a lapse into relapse.
  Design response: show clean-days-percent and longest run beside the current
  streak; make a slip a 30-second log, not a reset of identity. Streak research
  (Silverman & Barasch 2023): broken streaks suppress engagement, repairable
  ones less so.
- **Exercise**: Buchowski 2011 (n=12; 10 treadmill sessions over 2 weeks → use
  down ~50%, craving down on all MCQ factors; small, uncontrolled). McCartney
  2021 (inpatient RCT): cycling improved objective sleep vs stretching. A 2026
  inpatient RCT (n=46) found withdrawal and craving fell equally with cycling
  and stretching, so exercise is a sleep/mood support, not a treatment on its
  own. Across SUDs, exercise reduces craving with effect sizes ~0.4–0.5.
- **Medications**: none approved for cannabis withdrawal (Nielsen Cochrane
  2019). Gabapentin promising/unreplicated; NAC positive in adolescents, null
  in adults; nabiximols and CBD (400–800 mg/day) modest in trials and not
  practically available at those doses; zolpidem improved sleep but not
  abstinence; mirtazapine restored food intake but not abstinence.
  **Venlafaxine** (Levin 2013, n=103, cannabis dependence + depression):
  abstinence 11.8% on venlafaxine vs 36.5% on placebo; venlafaxine patients
  had more withdrawal-like symptoms (Kelly 2014). Implication for Tommy: do
  not change the dose during withdrawal, and tell the prescriber.
- **Digital interventions** (Olmos 2018 meta-analysis: 9 RCTs, SMD −0.19;
  CANreduce 2.0, Quit the Shit, Reduce Your Use): small effects, high
  attrition; what helped was a daily diary with feedback, ≥5 structured
  modules, and adherence prompts. The Scratch agent plays the adherence /
  feedback role here.

## 4. Medication and body specifics

- **Pharmacokinetics**: THC is a weak in-vitro inhibitor of CYP2D6/2C9/3A4;
  removing it may slightly *lower* venlafaxine (2D6) and lemborexant (3A4)
  exposure, gradually (THC terminal half-life ~4 days in heavy users, up to
  ~10–13 days). Low practical concern. CYP1A2 induction comes from combustion,
  not vaping, and none of his drugs is a 1A2 substrate.
- **Venlafaxine discontinuation** overlaps cannabis withdrawal (headache,
  irritability, anxiety, insomnia, vivid dreams, sweating, nausea, appetite
  loss). Discriminators: brain zaps, vertigo, paresthesias = venlafaxine;
  craving, decreased appetite/weight loss, stomach pain, chills = cannabis.
  Hold the dose steady for 3–4 weeks is a reasonable thing to ask the
  prescriber. Dexamphetamine + venlafaxine has case reports of serotonin
  toxicity; both raise blood pressure. Monitor, not stop.
- **Vyvanse**: decreased appetite in 27% of adults (label); suppression begins
  1–2 h post-dose and peaks 3–4 h. Eat the biggest protein meal before or
  within 30 min of the capsule; alarms for lunch and afternoon snack; liquid
  calories mid-day; big dinner once it fades. Morning dosing only. Cannabis
  withdrawal in ADHD adults looks like withdrawal in non-ADHD adults; untreated
  ADHD worsens relapse risk, so do not stop the stimulant.
- **Lemborexant**: within 30 min of bed, ≥7 h before wake; food delays onset,
  so big meal early, pill later; label says do not combine with alcohol
  (higher exposure, worse balance and memory). Vivid dreams in withdrawal are
  REM rebound and are a recovery sign. Melatonin adds little on top of an
  orexin antagonist (meta-analyses: ~7 min faster onset) and is one more
  variable; mention to prescriber rather than self-add.
- **Appetite / weight**: appetite loss and weight loss track days 1–14 in
  Budney 2003 and reverse with abstinence. Schedule eating; small frequent
  meals; protein ~1.6 g/kg/day (Morton 2018); ginger ≥1 g/day has meta-analytic
  support for nausea in other settings. Iron: non-heme absorption cut ~60% by
  coffee/tea with meals; keep an hour away from coffee and dairy; vitamin C
  helps. Iron deficiency without anaemia causes fatigue (Vaucher 2012).
  **White tongue / bad taste**: most likely dry mouth (THC acts on CB1 in the
  submandibular gland; nicotine aerosol and Vyvanse also dry the mouth) plus
  dehydration and low intake. Water, tongue scraper, brushing, eating. See a
  doctor if painful, cottage-cheese-like, bleeds when scraped, or persists past
  ~2 weeks (thrush). Ask for ferritin, B12 and zinc together.
- **Nicotine**: Lee 2019 RCT: addressing tobacco during cannabis treatment did
  not worsen cannabis outcomes. Allsop 2014: during cannabis abstinence,
  cigarette use rose ~14/week, predicted specifically by withdrawal insomnia,
  restlessness and physical symptoms. Vandrey 2008: quitting both at once was
  not worse than either alone. Clinician consensus: cannabis is the primary
  target; do not add an unaided nicotine cold-turkey in the same week; *do*
  change the delivery form (pouch/gum/patch) because the vape is a cannabis
  cue; then taper nicotine in weeks 3–6.
- **Alcohol**: substitution is measured (Schuster 2020: drinking rose in week 1
  of paid cannabis abstinence and stayed up; Peters & Hughes 2010: +15%
  drinks/day, +52% in those with past alcohol problems). Alcohol fragments
  sleep, interacts with all three medications (venlafaxine: avoid; lemborexant:
  do not combine; Vyvanse masks intoxication), and "hangxiety" is larger in
  shy/socially anxious drinkers (Marsh 2019). For ~a month it does the
  opposite of every job withdrawal needs done.
- **Exercise realism**: under-fuelled, under-slept, possibly iron-deficient in
  week 1. Two or three 20–35 min moderate sessions plus walks beats four hard
  lifts on one meal a day. Exercise transiently raises plasma THC in regular
  users (mobilised from fat); not harmful.
- **Supplements**: creatine fine (needs water); magnesium modest/inconsistent
  for sleep (low certainty), keep in the evening, away from iron; vitamin D
  best-supported of the three for mood (SMD ~−0.32 per 1000 IU/day), continue.
  None changes the first two weeks.

## 5. What ex-users say (r/leaves ~427k members, r/Petioles, quit-weed creators)

- Norms: "All I have to do now is not smoke today." Cravings "like waves."
  Taper allowed but capped at two weeks; cold turkey is the default culture.
- Most-credited tactics, roughly in order: sweaty cardio 30–45 min; get rid of
  the hardware the same day ("never test yourself"); tell one person; daily
  walks in daylight; sleep stack (magnesium, phone out of bed, accept sleep is
  last to normalize); small frequent meals, shakes, ginger, hot showers for
  nausea; urge surfing / wait-30-minutes; slow breathing for the inhale
  ritual; keep hands busy with projects; change the geography; count days but
  promise 24 h at a time; hang with non-smokers first.
- Concentrate/cart users report harsher withdrawal: appetite 1–2 weeks, sleep
  3–6 weeks, flatness into weeks 4–6 ("the fourth week most difficult").
- Relapse windows: days 3–7 ("I just need to sleep") and days 10–21 ("see, I'm
  fine"). The social pass is the classic trigger; pre-rehearse one sentence.
  Alcohol is the top-rated relapse accelerant. Outpatient data: 71% of people
  who reach 2 weeks lapse within 6 months and early lapses predict full
  relapse (Moore & Budney 2003).
- Quitting at parents' then returning to campus: home is the easy part and
  creates false confidence; clear the room before night one back; tell the
  smoking friends before you are back, not in the moment; see non-smoking
  friends first.
- Apps: what people actually use is the counter, a 10-second check-in,
  same-stage peer stories, and a craving-moment tool (most apps lack one);
  what gets called gimmicky is generic quotes, detached badges, paywalled
  community.
- Experts: Dr. Matthew Hill (on Huberman Lab) on 16–24 use and anxiety; Dr. K
  (HealthyGamer) on weed as emotion suppression — quitting surfaces "a ball of
  undigested emotion" that needs processing not numbing; Dr. Jordan Tishler on
  dependence rates being markedly higher in young adults.

## 6. Local supports (verified Oct 2026, confirm by phone)

- 988 Suicide Crisis Helpline — call or text 988, 24/7, Canada-wide.
- Reach Out 24/7 (CMHA Thames Valley; London/Middlesex) — 519-433-2023,
  toll-free 1-866-933-2023, web chat; 24/7 walk-in Crisis Centre, 648 Huron St.
- ConnexOntario — 1-866-531-2600, 24/7 addiction/mental health navigation.
- Good2Talk (Ontario post-secondary) — 1-866-925-5454, 24/7.
- Western Health & Wellness — Thames Hall 2170, 519-661-3030, Mon–Fri 9–4,
  same-day mental-health crisis appointments; up to 6 counselling sessions a
  year.
- Huron Wellness Services — Caskey Gilday Wellness Centre; drop-in counselling
  Mon 1:30–2:30, Thu 9:30–10:30; huronwellness@huron.uwo.ca.
- Toronto (reading week): Access CAMH 416-535-8501 press 2; CAMH Youth
  Addiction & Concurrent Disorders Service (ages 14–24).

## Sources

Clinical: Bahji 2020 https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2764234 ·
Connor 2022 https://onlinelibrary.wiley.com/doi/10.1111/add.15743 ·
Budney & Hughes 2003 https://pubmed.ncbi.nlm.nih.gov/12943018/ ·
Budney 2004 https://psychiatryonline.org/doi/10.1176/appi.ajp.161.11.1967 ·
Hasin 2013 https://pmc.ncbi.nlm.nih.gov/articles/PMC3733446 ·
Allsop 2011 https://www.sciencedirect.com/science/article/abs/pii/S0376871611002663 ·
CWS form https://datashare.nida.nih.gov/instrument/cannabis-withdrawal-scale ·
Allsop 2012 https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0044864 ·
Allsop 2014 (tobacco/alcohol substitution) https://pubmed.ncbi.nlm.nih.gov/24613633/ ·
Freeman & Winstock 2015 https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4611354/ ·
Hines 2020 https://bristol.ac.uk/news/2020/may/cannabis-potency-research.html ·
Bidwell 2020 https://jamanetwork.com/journals/jamapsychiatry/fullarticle/2767219 ·
Gates 2016 Cochrane https://www.cochrane.org/evidence/CD005336_psychosocial-interventions-cannabis-use-disorder ·
Nielsen 2019 Cochrane https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD008940.pub3/abstract/ja ·
Buchowski 2011 https://pmc.ncbi.nlm.nih.gov/articles/PMC3050879 ·
McCartney 2021 https://onlinelibrary.wiley.com/doi/10.1111/jsr.13211 ·
Levin 2013 https://pmc.ncbi.nlm.nih.gov/articles/PMC3636166 ·
Moore & Budney 2003 https://pubmed.ncbi.nlm.nih.gov/14629990/ ·
Chesney 2024 https://www.cambridge.org/core/journals/the-british-journal-of-psychiatry/article/psychosis-associated-with-cannabis-withdrawal-systematic-review-and-case-series/FEBCB6263EE4801B8326C4BA2FADB4E1 ·
Cleveland Clinic https://my.clevelandclinic.org/health/diseases/marijuana-weed-withdrawal

Behaviour change: Gollwitzer & Sheeran 2006 https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf ·
McWilliams 2019 https://eprints.whiterose.ac.uk/154864/ ·
Bowen 2014 https://www.psychiatry.wisc.edu/wp-content/uploads/2025/05/Article-1_Bowen-et-al-JAMA-2014.pdf ·
Lima 2024 CM for CUD https://karger.com/ear/article/30/5/321/914353 ·
Halpern 2015 (deposit contracts) https://chibe.upenn.edu/news/testing-financial-incentive-programs-for-smoking-cessation/ ·
Silverman & Barasch 2023 https://udspace.udel.edu/items/42ce576b-8e1f-429a-8541-e29e48dbcfbb ·
Olmos 2018 https://www.sciencedirect.com/science/article/abs/pii/S0306460317304537 ·
CANreduce 2.0 https://www.jmir.org/2021/4/e27463 ·
Marlatt RP overview https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6760427/ ·
BBTI https://sleep.pitt.edu/sites/default/files/assets/Instrument%20Materials/BBTI%20Review.pdf

Medications / body: Antoniou 2020 https://pmc.ncbi.nlm.nih.gov/articles/PMC7443220/ ·
Lemborexant label https://www.accessdata.fda.gov/drugsatfda_docs/label/2023/212028s007lbl.pdf ·
Lemborexant Canada PM https://pdf.hres.ca/dpd_pm/00071351.PDF ·
MedlinePlus venlafaxine https://medlineplus.gov/druginfo/meds/a694020.html ·
Lee 2019 (tobacco during CUD treatment) https://www.sciencedirect.com/science/article/pii/S0740547218304094 ·
Vandrey 2008 https://pmc.ncbi.nlm.nih.gov/articles/PMC2214670 ·
Schuster 2020 https://www.sciencedirect.com/science/article/abs/pii/S0278584620305212 ·
Peters & Hughes 2010 https://friendsresearch.org/paper/daily-marijuana-users-with-past-alcohol-problems-increase-alcohol-consumption-during-marijuana-abstinence/ ·
Marsh 2019 hangxiety https://www.ucl.ac.uk/news/2018/dec/shy-people-more-prone-anxiety-during-hangovers ·
Morton 2018 protein https://bjsm.bmj.com/content/52/6/376.abstract ·
CB1 and salivation https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9391487/ ·
Mayo underweight https://www.mayoclinic.org/healthy-lifestyle/nutrition-and-healthy-eating/expert-answers/underweight/faq-20058429

Community / experts: MEL on r/leaves https://melmagazine.com/en-us/story/reddit-leaves-how-to-quit-marijuana ·
r/leaves rules https://leaves.org/moderating-reddit-the-rules ·
Marijuana Moment https://www.marijuanamoment.net/how-marijuana-enthusiasts-came-to-embrace-a-reddit-forum-dedicated-to-helping-people-quit/ ·
Concentrate dependence https://cannabisdependence.org/understand/concentrate-dependence ·
Reddit-tested tips https://scienceinsights.org/how-to-help-with-weed-withdrawal-reddit-tested-tips/ ·
Stanford REACH quitting tips https://med.stanford.edu/halpern-felsher-reach-lab/resources/quitting-tips-for-cannabis.html ·
Clear30 friends guide https://clear30.org/guides/friends ·
Dr. Matthew Hill / Huberman notes https://podcastnotes.org/huberman-lab/dr-matthew-hill-how-cannabis-impacts-health-the-potential-risks-huberman-lab/ ·
Dr. K on weed https://www.youtube.com/watch?v=WdM8r6R3FfM

Supports: 988 https://mentalhealthcommission.ca/catalyst/988-launches-in-canada/ ·
Reach Out https://cmhatv.ca/crisis-centre-returns-to-huron-street ·
ConnexOntario https://www.connexontario.ca/ ·
Western crisis https://www.uwo.ca/health/crisis.html ·
Huron counselling https://huronu.ca/wellness-services/counselling-support/
