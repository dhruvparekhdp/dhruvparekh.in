# Navratri at VoloFin — scoreboard

Live page: `https://dhruvparekh.in/navratri/` (also `/garba`).

- `navratri/index.html` — the whole page (today's colour, leaderboard, teams, rules, bingo, scorekeeper desk).
- `netlify/functions/navratri.mjs` + `netlify/lib/navratri-core.mjs` — the server. Scores live in one
  JSON file in Netlify Blobs (store `navratri-2026`). No database.

## Login

Scorekeeper username is `dhruv`. The password is not stored in the repo, only a slow scrypt hash
of it (`netlify/lib/navratri-core.mjs`). Sessions last 4 hours. The signing secret is generated on
the server and kept in Blobs. To change the password without a code change, set the
`NAVRATRI_ADMIN_PASSWORD` env var in Netlify and redeploy.

## Colour Police

The scorekeeper ticks who didn't wear the day's colour; the roll-call fills in 7 minus defaulters.
Each defaulter gets one spin of the forfeit wheel. The server picks the forfeit at random, it can't
be re-spun, and the result is public on the Today tab and in the Transparency log.

## Anti-cheating checks (all enforced on the server)

- Password compared server-side in constant time; never in the page source.
- 5 wrong logins from one network → locked 15 min; 30 wrong logins in total → login locked 15 min.
  Failed logins show up in the public Transparency log.
- Sessions are signed tokens that expire after 4 hours and live only in the browser tab.
  "Sign out all devices" invalidates every session immediately.
- Only same-site JSON requests are accepted (blocks scripts on other sites).
- Every award is validated: day must be an office day that has already happened, points must be in
  range for the category, snack points only for that day's host team, no double scoring, full-team
  bonus only after a 7/7 colour count, traditional wear and bingo only on Friday, penalties need a reason.
- Removals are soft deletes with a public reason; every change is in the public Transparency log.
- Cheers are public but rate-limited and never affect points.

If the password leaks: set `NAVRATRI_ADMIN_PASSWORD` in Netlify, redeploy, then press "Sign out all devices".
