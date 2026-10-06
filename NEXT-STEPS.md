# Tommy — Your Next Steps

Everything below is the stuff only you can do. Work top to bottom; each section
says how to check it worked.

---

## 0. Turn on the quit tracker (~5 minutes) — do this first

### a. Either: one command
Set `SUPABASE_DB_URL` (Dashboard → Project Settings → Database → Connection
string → URI, with the password) and optionally `SUPABASE_ACCESS_TOKEN` +
`SUPABASE_PROJECT_REF`, then:
```
bash scripts/setup-quit.sh
```
It applies migration 0011 (skips if already applied) and redeploys
scratch-agent. To have Claude run it for you: add those as secrets in the
cloud environment settings (Edit environment → API credentials / environment
variables) and start a new session saying "run scripts/setup-quit.sh".

### a. Or: by hand
1. https://supabase.com/dashboard → your project → SQL Editor → New query.
2. Paste the entire contents of `supabase/migrations/0011_quit_cannabis.sql`
   and hit Run. (It creates `quit_attempts`, `withdrawal_checkins`, `cravings`,
   `coping_tools`, `if_then_plans`, `quit_milestones`, `support_contacts`.)
3. Redeploy Scratch so he knows about the quit:
   ```
   cd ~/Desktop/coding-projects/my-first-project
   supabase functions deploy scratch-agent
   ```
   (Only needed if Scratch is already set up from step 1 below. Scratch gets
   two new tools, `log_craving` and `quick_checkin`, and sees your day number.)

### c. Use it
- App → Recovery → **Start the quit**. Set "last hit", pick your reasons, decide
  the day 3 and day 7 rewards.
- **Craving now** when it hits. **Check in** every night, under a minute.
- The plan itself is `docs/quit/PLAN.md`. Read it on the train Thursday.
- Fill in Mom's, Dad's and Sunil's numbers under *People & lines* so the call
  button works at 1 am.

### d. Check it worked
- Recovery shows a green "off weed · N days" card with the two buttons.
- Say "craving, 7 out of 10, bored" to Scratch → a craving row appears on the
  quit dashboard.

---

## 1. Turn on Scratch's brain (~10 minutes)

### a. Get your Anthropic API key
1. Go to https://console.anthropic.com and sign in (create an account if needed
   — you'll add a payment method; usage is pay-per-use and a chat costs pennies).
2. Settings → API Keys → Create Key. Copy it (starts with `sk-ant-`).

### b. Run the database migration
1. Go to https://supabase.com/dashboard and open your project.
2. SQL Editor → New query.
3. Paste the entire contents of `supabase/migrations/0003_scratch_messages.sql`
   (in this project folder) and hit Run.

### c. Deploy the function (Terminal)
```
brew install supabase/tap/supabase
cd ~/Desktop/coding-projects/my-first-project
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...your key...
supabase functions deploy scratch-agent
```
Your project ref is in the Supabase dashboard URL:
`https://supabase.com/dashboard/project/<your-project-ref>`

### d. Check it worked
Open the app → chat with Scratch. He should reply for real.
- If he says his brain isn't hooked up: re-run the `secrets set` line.
- If he "shanks" every message: Supabase dashboard → Edge Functions →
  scratch-agent → Logs shows why.

---

## 2. Phone test (Expo Go)

```
cd ~/Desktop/coding-projects/my-first-project
npx expo start
```
Scan the QR code, then check off this list:

- [ ] App opens on Scratch: mascot leaning on his driver, Daily Read, section
      cards below it, chat bar — nothing hidden behind the home indicator
- [ ] Daily Read says "Read by Scratch" (after step 1); reopening the app the
      same day does not regenerate it
- [ ] Chat: real replies; history survives killing and reopening the app
- [ ] Say "check off <a habit>" → a "✓ Checked off …" chip appears and the
      habit shows done in Recovery
- [ ] Say "create a habit called stretching" → it appears in Recovery
- [ ] SCRATCH / SECTIONS toggle bounces both ways
- [ ] Course page: swipe up/down glides the ball stop to stop
- [ ] Pinch out → whole hole; tap any flag → straight into that section;
      pinch in → back to travel view
- [ ] Dark mode looks right (dusk-tinted course, club still visible)

---

## 3. Merge the pull request

When the phone test feels good:
1. Open https://github.com/bytommynewman/tommy/pull/1
2. Click **Merge pull request** → Confirm.

(Or just tell Claude "merge it".)

---

## 4. ~~One decision to make~~ — done ✓

The Daily Read cache now lives in the encrypted keychain (same place as your
login token). Nothing for you to do here.

---

## 5. Turn on the Content section (2 steps, ~3 minutes)

The Ideas tab needs its database table and its brain deployed:

1. **Database:** Supabase dashboard → SQL Editor → New query → paste all of
   `supabase/migrations/0004_content.sql` → Run. Expect "Success. No rows returned".
   (Claude can put it on your clipboard — just ask.)
2. **Deploy the brain:** in Terminal:
   ```
   cd ~/Desktop/coding-projects/my-first-project
   supabase functions deploy content-agent
   ```

Then in the app: course → hole 6 (content) → ideas → "radio scratch for ideas".

## 6. Turn on the live market feed (1 step)

Invest → Market pulls the five majors live. Deploy its function in Terminal:
```
cd ~/Desktop/coding-projects/my-first-project
supabase functions deploy market-data
```

## 7. Turn on the Wealthsimple portfolio (SnapTrade keys already set ✓)

1. **Database:** SQL Editor → New query → paste `supabase/migrations/0005_snaptrade.sql` → Run.
2. **Deploy:** in Terminal:
   ```
   cd ~/Desktop/coding-projects/my-first-project
   supabase functions deploy snaptrade-portfolio
   ```
3. In the app: Invest → Portfolio → **connect account** → log into
   Wealthsimple on SnapTrade's page → come back → pull down to refresh.

## After that

- Content slice 3: Instagram stats — you'll get CONNECT-INSTAGRAM.md, a
  click-by-click guide for the Meta/Instagram developer setup.
- Then: individual section design passes (Recovery, Reflect, Plan, Life,
  Invest) — tell Claude which one to start with.
