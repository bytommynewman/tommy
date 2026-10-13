# Template 3 — Caption, hashtags and posting notes

Used after the clips are cut together. Claude answers with JSON only.

---

Write the posting copy for a 15–30 s vertical ad.

- Business: {{business}}
- Ad title: {{title}}
- CTA: {{cta}}
- Platform: {{platform}}   (Instagram Reels | YouTube Shorts | client's own ads)
- Posting as: {{poster}}   (the business | my creator account for a Higgsfield Earn campaign)

Rules
- Caption: 1–2 lines, first person if posting as the creator, brand voice if posting as the business.
- If posting for a Higgsfield Earn campaign: include the campaign hashtag and bio code
  placeholder `{{earn_tag}}` exactly as given, keep the Higgsfield watermark, and note
  the campaign's length limit in `notes`.
- 12–18 hashtags mixing local, niche and broad.
- One line in `notes` on when to post (local time) and what to pin in comments.

Reply with STRICT JSON only, no markdown, no fences:
{ "caption": string, "hashtags": string, "notes": string }
