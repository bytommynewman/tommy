# Tommy — Your Next Steps

Everything below is the stuff only you can do. Work top to bottom; each section
says how to check it worked.

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

## 4. One decision to make (no rush)

The Daily Read can mention streak details (e.g. "12 days clean on …") and is
cached in the phone's normal app storage — not the encrypted keychain your
login token uses. Fine for most people since it's your own phone; if you'd
rather it be encrypted too, tell Claude: "encrypt the daily read cache."

---

## After that

Next build phase whenever you want it: designing the individual sections —
Recovery, Reflect, Plan, Life, Invest — each gets its own design pass.
Just tell Claude which one to start with.
