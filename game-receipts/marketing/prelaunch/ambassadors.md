# Founding Member program (group-chat captains)

**One line:** bring 5 friends onto the waitlist, get early access and a permanent "Founding Member" badge.

## How it works
1. A captain signs up for the waitlist (or is invited by us) and gets a personal referral link: `https://<waitlist-url>/?ref=<their-code>`. The page already stores `?ref=` and submits it with the email, so it appears as the `ref` column in the signup export.
2. A **qualified referral** = a distinct, valid email that joined via that link and (once the app opens) creates an account. Self-referrals, duplicate emails, throwaway/disposable domains and bot signups don't count.
3. **5 qualified referrals = Founding Member:** early access before public launch, a permanent profile badge, and your name on the founders' wall if you want it.
4. **Invite 3 friends = early access** (the waitlist page's promise). Founding Member is the higher tier: 5 friends, plus the badge.
5. **Top captains:** the 3 captains with the most qualified referrals by launch day get a pinned shout-out and first pick of vanity handle. Reward is access and status only — no cash, no gift cards, no prizes with monetary value.

## Rules
- Free. No betting, no money, no stakes, no wagering framing anywhere in your invites.
- Be honest: don't say Game Receipts is live before launch, don't invent features, don't claim to be staff.
- No spam: group chats you're in, friends, your own socials. No bulk DMs, no paid/botted clicks, no incentives of your own (e.g. paying people to sign up).
- Disclose if you're also paid separately by us (#partner). Founding Member perks alone don't require a disclosure, but "I get early access if you join" is fair to say out loud.
- Privacy: we only store the email and the `ref` code, and use it to tell people when the app opens. Captains never see who joined, only their count.
- We can revoke a badge or access for fraud, abuse, or posting content that breaks the brief (team logos, betting talk, harassment).
- Counts are reviewed manually until launch. Edge cases: Tommy decides.

## Setup checklist (Tommy)
- Pick the form backend (see `waitlist/README.md`) and confirm it records the `ref` hidden field.
- Make a captain code list in a sheet (`code, name, group chat, joined_count`); count rows by `ref` with a pivot/COUNTIF.
- DM the badge-unlock message when a captain hits 5: "You're a Founding Member. Early access is yours. Badge goes live at launch."

## Copy for captains
> You've been picked as a group-chat captain for Game Receipts, an app that gives every sports take a date-stamped receipt. Free, no betting. Bring 5 friends to the waitlist with your link and you get early access plus a permanent Founding Member badge. Your link: {{link}}
