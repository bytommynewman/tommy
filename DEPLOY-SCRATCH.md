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
