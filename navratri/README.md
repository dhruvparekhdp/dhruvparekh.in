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

## Scoring

**Individual** = days ✓ (+1 each). Not in colour (✗) or absent = 0. Max 6.

Only exceptions are stored. From 5 PM IST on each office day everyone who is not marked ✗ or absent
automatically counts as ✓ (+1 for them and their team).

**Team** = Σ members' ✓ + Snacks + Extra bonus − Penalties. Best possible 60.

| | Points |
| --- | --- |
| Dress code ✓ | +1 per person per office day (max 42 per team) |
| Not in colour ✗ | 0 (no negative marking) |
| Snacks | 0–10, host team on its day |
| Extra bonus | up to 8 per team for the whole festival, reason required |
| Penalty | −1 to −15, reason required |

## Colour Police · daily attendance

Everyone is ✓ by default. At 5 PM the scorekeeper marks only the exceptions: ✗ not in colour or
· absent / on leave (stored as `defaulters` and `absentees`). Both score 0; there is no negative
marking. Mistakes are removed with ✕ and a public reason. The forfeit wheel is hidden
(`SHOW_FORFEIT_WHEEL = false`) and run offline in the office.

## Anti-cheating checks (all enforced on the server)

- Password compared server-side in constant time; never in the page source.
- 5 wrong logins from one network → locked 15 min; 30 wrong logins in total → login locked 15 min.
  Failed logins show up in the public Transparency log.
- Sessions are signed tokens that expire after 4 hours and live only in the browser tab.
  "Sign out all devices" invalidates every session immediately.
- Only same-site JSON requests are accepted (blocks scripts on other sites).
- Every award is validated: day must be an office day that has already happened, points must be in
  range, names must be on the team list, one dress-code point per person per day, snack points only
  for that day's host team, extra bonus capped at 8 per team, penalties need a reason.
- Removals are soft deletes with a public reason; every change is in the public Transparency log.

If the password leaks: set `NAVRATRI_ADMIN_PASSWORD` in Netlify, redeploy, then press "Sign out all devices".
