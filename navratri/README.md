# Navratri at VoloFin — scoreboard

Live page: `https://dhruvparekh.in/navratri/` (also `/garba`).

- `navratri/index.html` — the whole page (today's colour, leaderboard, teams, rules, bingo, scorekeeper desk).
- `netlify/functions/navratri.mjs` + `netlify/lib/navratri-core.mjs` — the server. Scores live in one
  JSON file in Netlify Blobs (store `navratri-2026`). No database.

## One-time setup (Netlify → Site configuration → Environment variables)

| Variable | Value |
| --- | --- |
| `NAVRATRI_ADMIN_USER` | scorekeeper username (3+ chars) |
| `NAVRATRI_ADMIN_PASSWORD` | 12+ characters — share only inside the cultural team |
| `NAVRATRI_SESSION_SECRET` | 32+ random characters, e.g. output of `openssl rand -hex 32` |

Redeploy after adding them. Until they exist, the scoreboard is read-only.

## Anti-cheating checks (all enforced on the server)

- Password compared server-side in constant time; never in the page source.
- 5 wrong logins from one network → locked 15 min; 30 wrong logins in total → login locked 15 min.
  Failed logins show up in the public Transparency log.
- Sessions are signed tokens that expire after 6 hours and live only in the browser tab.
  "Sign out all devices" invalidates every session immediately.
- Only same-site JSON requests are accepted (blocks scripts on other sites).
- Every award is validated: day must be an office day that has already happened, points must be in
  range for the category, snack points only for that day's host team, no double scoring, full-team
  bonus only after a 7/7 colour count, traditional wear and bingo only on Friday, penalties need a reason.
- Removals are soft deletes with a public reason; every change is in the public Transparency log.
- Cheers are public but rate-limited and never affect points.

If the password leaks: change `NAVRATRI_ADMIN_PASSWORD`, redeploy, then press "Sign out all devices".
