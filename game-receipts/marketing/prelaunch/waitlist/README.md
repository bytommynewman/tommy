# Waitlist page (static, no build step)

`index.html` plus the images next to it is the whole site. Mobile-first, brand colours, hero art, OG image at `og.png` (1200×630). Preview: `python3 -m http.server 4173` inside this folder, open http://localhost:4173.

## 1. Wire the form (required before launch)
Open `index.html`, find the CONFIG block near the bottom, and set **one** of:

```js
const FORM_ENDPOINT = "https://...";   // a service that accepts a POST of the form fields
const MAILTO_ADDRESS = "you@domain";   // fallback: opens the visitor's email app
```

- If `FORM_ENDPOINT` is set, the form posts `email`, `ref` (referrer code from `?ref=`), `source`, and a honeypot field as multipart form data with `Accept: application/json`, and shows a success message on any 2xx response.
- If it is empty and `MAILTO_ADDRESS` is set, submit opens a pre-filled email to you. Works with zero backend; you add signups by hand.
- If both are empty, the page says "Signups open soon" (nothing is sent anywhere). Nothing is collected until you decide where it goes.

Pick your own account so you control the data:

| Service | Steps |
|---|---|
| **Formspree** | Create a form at formspree.io, copy `https://formspree.io/f/<id>` into `FORM_ENDPOINT`. Export CSV from the dashboard. Free tier is fine for the waitlist. |
| **Buttondown** | Newsletter → Embed. Endpoint is `https://buttondown.com/api/emails/embed-subscribe/<username>`; the field must be named `email` (it is). Gives you double opt-in, unsubscribe and CSV export. If it rejects JSON accept headers, remove the `Accept` header in the `fetch` call. |
| **Tally** | Tally forms don't accept direct POSTs from custom pages; use its embed or link in a button instead. Simplest: keep this page and set `FORM_ENDPOINT` to a Formspree/Buttondown URL. |
| **Google Form** | Create a form with an email question, "Get pre-filled link" to find the field id (`entry.123456`), then change the input `name="email"` to that id and set `FORM_ENDPOINT` to `https://docs.google.com/forms/d/e/<FORM_ID>/formResponse`. Responses arrive in a Sheet (CSV export). The page will show an error because Google blocks reading the response (CORS); change `fetch(...)` to `fetch(FORM_ENDPOINT, {method:"POST", mode:"no-cors", body: new FormData(form)})` and treat a resolved promise as success. |

Referral tracking: the page reads `?ref=<code>` and sends it as `ref`. Give each ambassador `https://<url>/?ref=<code>` (see `../ambassadors.md`) and count rows per code in the export.

Privacy: the page loads no third-party scripts, fonts or trackers. The only data collected is what you point the form at. A one-line privacy sentence is in the footer; update it if you add analytics.

## 2. Replace `SITE_URL`
In `index.html` replace `https://SITE_URL/` (OG and Twitter image tags, share URL) with the deployed address, otherwise link previews will not show the image. Test with the Facebook Sharing Debugger / Twitter card validator after deploy.

## 3. Deploy (pick one; nothing has been deployed)
- **Higgsfield websites** (`higgsfield website --help` lists: `create`, `list`, `deploy`, `status`, `repo-access`, `rename`, `secrets`, `db`, `publish`, `categories`). `create --type website` (no template needed, a standalone site with no Higgsfield integration) makes a git repo, `repo-access <id>` returns the clone URL/branch/token, you copy this folder's files into the repo root and push, then `higgsfield website deploy <id>` builds and ships it; `status <id>` shows the live URL, `rename` changes the subdomain. It requires `higgsfield` login and may use credits; not run here. Its static build expectations (framework, `app/` layout) are unverified, so check the generated scaffold before copying.
- **Netlify Drop:** go to app.netlify.com/drop and drag this folder onto the page. Gives a live URL immediately; add a custom domain later in Site settings. No account needed to try; claim it by signing up to keep it.
- **Vercel:** `npx vercel --prod` from this folder (static, accept defaults, framework "Other"), or import a Git repo containing the folder.
- **GitHub Pages:** put the files in a repo (root, or `/docs`), Settings → Pages → Deploy from branch. URL is `https://<user>.github.io/<repo>/`. Add a `CNAME` file for a custom domain.
- **Cloudflare Pages:** Direct Upload this folder; free, fast, good for a custom domain.

For a custom domain (e.g. gamereceipts.com; see `../handles.md`) point DNS at the host per its instructions; HTTPS is automatic on all of the above.

## Files
`index.html` · `og.png` (also in `../assets/og-1200x630.png`) · `hero-tall.webp` / `hero-wide.webp` (background) · `logo.webp` · `icon-192.png` · `preview-*.png` (screenshots from `shoot.mjs`, safe to delete).
