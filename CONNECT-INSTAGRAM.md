# Connecting @bytommynewman to the app (one-time setup)

When this is done, the @bytommynewman tab shows your real followers, views,
likes and comments, and the "sync from instagram" button works. Instagram only
hands out numbers through their official door, so there are a few web steps —
all free, all one-time. Do them on the Mac, not the phone.

## 0. What you need first
- Your Instagram account must be a **Professional account** (Creator or
  Business). If it isn't yet: Instagram app → your profile → menu →
  **Settings** → **Account type and tools** → **Switch to professional
  account** → pick **Creator**. Free, takes a minute, you can switch back
  anytime.

## 1. Make a Meta app (the "official door")
1. Go to https://developers.facebook.com and log in with the Facebook/Meta
   account tied to you (create one if needed).
2. Click **My Apps** → **Create app**.
3. When it asks what your app does, choose **Other**, then app type
   **Business**. Name it anything — `tommy-life-app` works.
4. On the new app's dashboard, find the **Instagram** product and click
   **Set up**.
5. Inside Instagram setup, choose **API setup with Instagram login**.

## 2. Connect your Instagram and copy the token
1. In that same Instagram setup screen there's a **Generate access token**
   section (it may say "Add account" first) — click it, log into
   **@bytommynewman**, and approve.
2. A long code appears — that's your **access token**. Click its copy button
   (do NOT select it by hand; the copy button avoids broken line-breaks).

## 3. Give the token to the app
Open a terminal, paste this line but DON'T press enter yet, then paste the
token right after the `=` (using the copy button from step 2), THEN press
enter:

    cd ~/Desktop/coding-projects/my-first-project && supabase secrets set IG_ACCESS_TOKEN=

Check it took (the digest should NOT be e3b0c442...):

    supabase secrets list

## 4. Turn the sync on

    cd ~/Desktop/coding-projects/my-first-project && supabase functions deploy ig-sync

## 5. Test it
Open the app → course → content → **@bytommynewman** tab → hit
**> SYNC FROM INSTAGRAM_**. Followers, posts and reel stats should fill in.
If it errors, screenshot the message for Claude.

## Good to know
- The token lasts about **60 days**. When syncs start failing with a token
  error, redo steps 2-3 (two minutes) — or ask Claude to add auto-refresh.
- The token only allows READING your own profile/media stats. It can't post,
  delete, or touch DMs.
- The token lives only as a Supabase secret on the server — never in the app
  on your phone.
