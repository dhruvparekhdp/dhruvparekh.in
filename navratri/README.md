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

**Individual** = days wore the colour (+1 each) − days in office but not in colour (−1 each). Absent = 0.
Range −6 to +6 over the 6 scoring days.

**Team** = Σ members' ✓ + Snacks + Extra bonus − Σ members' ✗ − Penalties. Best possible 60.

| | Points |
| --- | --- |
| Dress code ✓ | +1 per person per office day (max 42 per team) |
| Not in colour ✗ | −1 per person per day, for the person and the team |
| Snacks | 0–10, host team on its day |
| Extra bonus | up to 8 per team for the whole festival, reason required |
| Penalty | −1 to −15, reason required |

## Colour Police · daily attendance

At 5 PM the scorekeeper marks every person ✓ wore the colour / ✗ didn't / · absent. ✓ gives the
dress-code point; ✗ puts them on the forfeit wheel. The server picks each forfeit at random, it
can't be re-spun, and the day's attendance and forfeits are public on the Today tab.

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
