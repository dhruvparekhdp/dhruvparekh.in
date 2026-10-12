# Prompt for Claude Code (local) — Navratri at VoloFin scoreboard

Copy everything below the line into Claude Code, run from the root of your local clone of
`dhruvparekhdp/dhruvparekh.in` (do `git pull origin main` first).

---

You are helping me (Dhruv, VoloFin cultural team) run and change the **Navratri at VoloFin** office
scoreboard that lives in this repo. It is LIVE at https://dhruvparekh.in/navratri/ (also /garba) and
42 colleagues use it during Navratri, 11–19 Oct 2026. Treat production data with care.

## What it is
- A single static page plus one Netlify Function. No database: all scores live in ONE JSON blob
  (Netlify Blobs store `navratri-2026`, key `state`). Netlify auto-deploys every push to `main`.
- Files:
  - `navratri/index.html` — the whole page (inline CSS + JS, no build step). Tabs: Today,
    Leaderboard (Team / Individual), My Team, 9 Colours, Rules, Bingo, Scorekeeper.
  - `netlify/functions/navratri.mjs` — thin wrapper, route `/api/navratri`.
  - `netlify/lib/navratri-core.mjs` — ALL server logic and validation (`createHandler`).
  - `navratri/tests/server.test.mjs` — server tests with an in-memory Blobs stand-in.
  - `navratri/README.md` — rules and security notes.
- Teams: 6 teams × 7 people (roster is duplicated in `ROSTER` in the core lib and `TEAMS` in the
  page — keep them identical). Office days that score: Day 2, 3, 4, 5, 6, 9.
  Snack hosts: Day 2 Team 1, Day 3 Team 2, Day 4 Team 3, Day 5 Team 4, Day 6 Team 5, Day 9 Team 6.

## Scoring rules (agreed by the cultural team — do not change unless I ask)
- Dress code: 1 point per PERSON per office day (max 6 per person, 42 per team). Stored as one
  entry per person (`category: 'colour'`, `name`, `points: 1`).
- Snacks: 0–10, only for that day's host team, once per day.
- Extra bonus: 1–10, reason required, capped at 10 per team for the whole festival.
- Penalty ("task not done"): −1 to −15, reason required.
- Two leaderboards: team total, and individual dress points out of 6.
- Colour Police = daily attendance: each person ✓ wore / ✗ didn't / · absent. ✗ people go on the
  forfeit wheel; the SERVER picks the forfeit at random (`PUNISHMENTS` in the core lib; the page has a
  copy only for the spin animation — keep both lists identical). A spin can be undone with a public
  reason (`unspin`) and spun again.
- Old categories (full_team, creativity, traditional, bingo, …) are kept only so any old entries still
  display; new ones are rejected.

## Security model (the office has IT people and automation testers — keep it strict)
- Scorekeeper login: username `dhruv`. The password is NOT in the repo, only a scrypt hash
  (`ADMIN_PASS_SCRYPT`). Never write the plaintext password into any file, commit, test or log.
  If I want to change it, generate a new `salt:hash` with Node's `crypto.scryptSync(pw, salt, 32,
  { N: 2**15, r: 8, p: 1, maxmem: 64*1024*1024 })`, or tell me to set `NAVRATRI_ADMIN_PASSWORD`
  in Netlify env (it overrides the hash).
- Sessions: HMAC-signed tokens, 4 hours, secret generated server-side and stored in Blobs (`secret`).
  "Sign out all devices" bumps `epoch`.
- 5 wrong logins per IP → 15 min lock; 30 total → global lock. Failed logins go to the public log.
- Same-origin JSON POSTs only. Every award is re-validated on the server; the page is never trusted.
- Every change is in the public Transparency log; removals are soft deletes with a reason.
- Keep all of this when changing things. Any new write action must: require a valid session,
  validate every field strictly, use `mutate()` (optimistic locking), and call `pushAudit()`.

## How to run locally
1. `npm install` (only dependency: `@netlify/blobs`).
2. Tests: `npm test` runs the public tests. To also run the logged-in tests, set the password only in
   your shell for that one command, e.g. `NAVRATRI_TEST_PASSWORD='…' npm test` — ask me for it, never
   save it to a file.
3. Full site with the function: `npx netlify-cli dev`, then open http://localhost:8888/navratri/.
   `netlify dev` uses a LOCAL Blobs sandbox, not production data, so it is safe to test there.
   If it complains about Blobs or a site ID, run `npx netlify-cli link` and pick the dhruvparekh.in site.
4. To see a specific festival day, change the clock in the browser (e.g. Playwright
   `page.clock.install({ time: new Date('2026-10-16T17:20:00+05:30') })`) — the page uses IST dates.

## Rules for every change
1. Read the relevant code first; keep the style (single HTML file, inline CSS/JS, no frameworks,
   no build step, mobile-first, festive look).
2. If you change the API response shape or anything the open page depends on, bump `APP_VERSION`
   in BOTH `netlify/lib/navratri-core.mjs` and `navratri/index.html` — open tabs reload themselves
   when it changes. Forgetting this crashed the scorekeeper tab once.
3. Never delete or rewrite the production `state` blob. Data fixes go through the page's Remove /
   Undo actions (they are logged) — tell me what to click instead of touching production data.
4. Before pushing: run `npm test` (with the password env if you touched login/scoring), run
   `node --check netlify/lib/navratri-core.mjs`, and test the change in `netlify dev` in a browser at
   phone width (390px) and desktop.
5. Add or update a test in `navratri/tests/server.test.mjs` for any server rule you change.
6. Update `navratri/README.md` (and the Rules tab text) if a rule changes.
7. Show me the diff and wait for my OK before `git push origin main` — pushing deploys to the whole
   office within ~2 minutes.

## My task for you now
<write what you want here, e.g. "add a photo-of-the-day section" or "change extra bonus cap to 8">
