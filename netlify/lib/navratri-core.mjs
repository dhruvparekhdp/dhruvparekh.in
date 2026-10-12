// Navratri at VoloFin — scoreboard logic.
//
// Everything that matters for fairness happens here on the server:
// the browser only ever *asks* for points to be added, and every
// request is re-checked against the rules below. Storage is a single
// JSON "file" in Netlify Blobs; a second blob tracks login failures.
//
// Required environment variables (Netlify → Site settings → Env):
//   NAVRATRI_ADMIN_USER       scorekeeper username
//   NAVRATRI_ADMIN_PASSWORD   at least 12 characters
//   NAVRATRI_SESSION_SECRET   at least 32 random characters
// Without them the scoreboard is read-only.

import crypto from 'node:crypto';

export const TEAMS = [1, 2, 3, 4, 5, 6];
// day -> hosting team (from the Navratri poster); 0 = no host
export const HOST = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 0, 8: 0, 9: 6 };
export const OFFICE_DAYS = [2, 3, 4, 5, 6, 9];
export const DAY_DATES = {
  1: '2026-10-11', 2: '2026-10-12', 3: '2026-10-13', 4: '2026-10-14', 5: '2026-10-15',
  6: '2026-10-16', 7: '2026-10-17', 8: '2026-10-18', 9: '2026-10-19',
};
export const TRADITIONAL_DAY = 6;
export const TEAM_SIZE = 7;

// Allowed points per category. `once` = at most one live entry per team per day.
export const RULES = {
  colour:       { label: 'Wore the colour (1 per member)', min: 1,   max: TEAM_SIZE, once: true },
  full_team:    { label: 'Full-team colour bonus',          min: 5,   max: 5,         once: true },
  extra_effort: { label: 'Extra colour effort',             min: 1,   max: 5,         once: true },
  snack:        { label: 'Snack presentation',              min: 0,   max: 10,        once: true, hostOnly: true },
  creativity:   { label: 'Snack creativity',                min: 0,   max: 5,         once: true, hostOnly: true },
  traditional:  { label: 'Traditional wear (2 per member)', min: 2,   max: 2 * TEAM_SIZE, once: true, dayOnly: TRADITIONAL_DAY, step: 2 },
  bingo:        { label: 'Bingo winner',                    allowed: [10, 6, 3], dayOnly: TRADITIONAL_DAY },
  penalty:      { label: 'Task not done',                   min: -15, max: -1, noteRequired: true },
  other:        { label: 'Judges’ special',            min: -5,  max: 5,  noteRequired: true },
};

const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_GLOBAL = 30;
const CHEERS_PER_IP_PER_MIN = 30; // office shares one IP, so keep it generous
const MAX_BODY_BYTES = 4096;
const AUDIT_KEEP = 500;

const json = (status, body, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extra,
  },
});

export function todayIST(now = Date.now()) {
  return new Date(now + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

function emptyState() {
  return { entries: [], cheers: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, audit: [], epoch: 1, cheerLimits: {}, updated: null };
}

function config(env) {
  const user = env.NAVRATRI_ADMIN_USER || '';
  const pass = env.NAVRATRI_ADMIN_PASSWORD || '';
  const secret = env.NAVRATRI_SESSION_SECRET || '';
  const ok = user.length >= 3 && pass.length >= 12 && secret.length >= 32;
  return { ok, user, pass, secret };
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
function safeEqual(a, b) {
  // hash both so lengths match and timing reveals nothing
  return crypto.timingSafeEqual(sha(a), sha(b));
}
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');
const ipTag = (secret, ip) => hmac(secret || 'navratri', 'ip:' + ip).slice(0, 12);

export function signToken(secret, payload) {
  const body = b64u(JSON.stringify(payload));
  return body + '.' + hmac(secret, body);
}
export function verifyToken(secret, token, epoch, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 512) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = hmac(secret, body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let p;
  try { p = JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { return null; }
  if (!p || typeof p.exp !== 'number' || p.exp < now) return null;
  if (p.epoch !== epoch) return null; // "log out everywhere" bumps the epoch
  return p;
}

// Read-modify-write with optimistic locking so two writes never clobber each other.
async function mutate(store, key, init, fn) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const found = await store.getWithMetadata(key, { type: 'json' });
    const state = found ? found.data : init();
    const result = await fn(state);
    if (result && result.abort) return result;
    const res = found
      ? await store.setJSON(key, state, { onlyIfMatch: found.etag })
      : await store.setJSON(key, state, { onlyIfNew: true });
    if (res.modified) return result;
  }
  throw new Error('Busy — please try again');
}

function publicView(state, now) {
  return {
    entries: state.entries.map(e => ({
      id: e.id, day: e.day, team: e.team, category: e.category, points: e.points,
      note: e.note || '', at: e.at, deleted: e.deleted ? { at: e.deleted.at, reason: e.deleted.reason } : null,
    })),
    cheers: state.cheers,
    audit: state.audit.slice(-60).map(a => ({ at: a.at, action: a.action, detail: a.detail })),
    updated: state.updated,
    today: todayIST(now),
  };
}

function cleanNote(s) {
  if (s == null) return '';
  if (typeof s !== 'string') return null;
  // strip control chars and angle brackets; the page escapes anyway
  return s.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 120);
}

// Strict validation of one award. Returns an error string or null.
export function validateAward(state, a, today) {
  if (!a || typeof a !== 'object') return 'Bad request';
  const { day, team, category, points } = a;
  if (!Number.isInteger(day) || day < 1 || day > 9) return 'Day must be 1–9';
  if (!Number.isInteger(team) || !TEAMS.includes(team)) return 'Team must be 1–6';
  const rule = RULES[category];
  if (!rule) return 'Unknown category';
  if (!Number.isInteger(points)) return 'Points must be a whole number';
  if (!OFFICE_DAYS.includes(day)) return `Day ${day} is not an office day`;
  if (DAY_DATES[day] > today) return `Day ${day} hasn’t happened yet — no advance scoring`;
  if (rule.allowed ? !rule.allowed.includes(points) : (points < rule.min || points > rule.max)) {
    return `${rule.label}: points must be ${rule.allowed ? rule.allowed.join(' / ') : `${rule.min} to ${rule.max}`}`;
  }
  if (rule.step && points % rule.step !== 0) return `${rule.label}: must be a multiple of ${rule.step}`;
  if (rule.dayOnly && day !== rule.dayOnly) return `${rule.label} only counts on Day ${rule.dayOnly}`;
  if (rule.hostOnly && HOST[day] !== team) return `${rule.label} is only for the hosting team (Team ${HOST[day]} on Day ${day})`;
  const note = cleanNote(a.note);
  if (note === null) return 'Note must be text';
  if (rule.noteRequired && note.length < 3) return `${rule.label} needs a short reason`;
  const live = state.entries.filter(e => !e.deleted && e.day === day);
  if (rule.once && live.some(e => e.team === team && e.category === category)) {
    return `Team ${team} already has “${rule.label}” for Day ${day}. Remove the old entry first.`;
  }
  if (category === 'full_team' && !live.some(e => e.team === team && e.category === 'colour' && e.points === TEAM_SIZE)) {
    return 'Full-team bonus needs all 7 members scored under “Wore the colour” first';
  }
  if (category === 'bingo') {
    if (live.some(e => e.category === 'bingo' && e.points === points)) return 'That bingo place is already awarded';
    if (live.some(e => e.category === 'bingo' && e.team === team)) return `Team ${team} already has a bingo award`;
  }
  return null;
}

export function createHandler({ store, env, now = () => Date.now() }) {
  const cfg = config(env);

  return async function handle(req, ip = '0.0.0.0') {
    const t = now();
    const ipId = ipTag(cfg.secret, ip);

    if (req.method === 'GET') {
      const state = (await store.get('state', { type: 'json' })) || emptyState();
      return json(200, { ...publicView(state, t), adminEnabled: cfg.ok });
    }
    if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

    // Same-origin only (browsers always send Origin on POST).
    const origin = req.headers.get('origin');
    const host = new URL(req.url).host;
    if (!origin || new URL(origin).host !== host) return json(403, { error: 'Cross-site request blocked' });
    if (!(req.headers.get('content-type') || '').startsWith('application/json')) return json(415, { error: 'JSON only' });

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'Too large' });
    let body;
    try { body = JSON.parse(raw); } catch { return json(400, { error: 'Bad JSON' }); }
    if (!body || typeof body !== 'object') return json(400, { error: 'Bad request' });

    // ── cheers: public, rate limited, never affect points ──
    if (body.action === 'cheer') {
      const team = body.team;
      if (!Number.isInteger(team) || !TEAMS.includes(team)) return json(400, { error: 'Unknown team' });
      const minute = Math.floor(t / 60000);
      const out = await mutate(store, 'state', emptyState, (s) => {
        s.cheerLimits = s.cheerLimits || {};
        for (const k of Object.keys(s.cheerLimits)) if (s.cheerLimits[k].m !== minute) delete s.cheerLimits[k];
        const lim = s.cheerLimits[ipId] || { m: minute, n: 0 };
        if (lim.n >= CHEERS_PER_IP_PER_MIN) return { abort: true, limited: true };
        lim.n++; s.cheerLimits[ipId] = lim;
        s.cheers[team] = (s.cheers[team] || 0) + 1;
        return { count: s.cheers[team] };
      });
      if (out.limited) return json(429, { error: 'Easy there! Cheers are limited — try again in a minute 🙂' });
      return json(200, out);
    }

    if (!cfg.ok) return json(503, { error: 'Scorekeeper login is not set up on the server yet' });

    // ── login: brute-force protected ──
    if (body.action === 'login') {
      const auth = (await store.get('auth', { type: 'json' })) || { ips: {}, global: [] };
      const recent = (arr) => (arr || []).filter(x => t - x < FAIL_WINDOW_MS);
      auth.global = recent(auth.global);
      const mine = recent(auth.ips[ipId]);
      if (mine.length >= MAX_FAILS_PER_IP || auth.global.length >= MAX_FAILS_GLOBAL) {
        return json(429, { error: 'Too many wrong attempts. Login is locked for 15 minutes.' });
      }
      const userOk = safeEqual(typeof body.user === 'string' ? body.user.trim() : '', cfg.user);
      const passOk = safeEqual(typeof body.password === 'string' ? body.password : '', cfg.pass);
      if (!(userOk && passOk)) {
        mine.push(t); auth.global.push(t); auth.ips[ipId] = mine;
        for (const k of Object.keys(auth.ips)) if (!recent(auth.ips[k]).length) delete auth.ips[k];
        await store.setJSON('auth', auth);
        await mutate(store, 'state', emptyState, (s) => { pushAudit(s, t, 'login_failed', `Wrong scorekeeper login (${ipId.slice(0, 4)}…)`); });
        await new Promise(r => setTimeout(r, 800));
        const left = MAX_FAILS_PER_IP - mine.length;
        return json(401, { error: left > 0 ? `Wrong username or password. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Locked for 15 minutes.' });
      }
      delete auth.ips[ipId];
      await store.setJSON('auth', auth);
      const epoch = await mutate(store, 'state', emptyState, (s) => { pushAudit(s, t, 'login', 'Scorekeeper signed in'); return s.epoch; });
      const exp = t + SESSION_TTL_MS;
      return json(200, { token: signToken(cfg.secret, { exp, epoch, n: b64u(crypto.randomBytes(9)) }), exp });
    }

    // ── everything below needs a valid session ──
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const current = (await store.get('state', { type: 'json' })) || emptyState();
    if (!verifyToken(cfg.secret, token, current.epoch, t)) return json(401, { error: 'Session expired — please sign in again' });
    const today = todayIST(t);

    if (body.action === 'add') {
      const out = await mutate(store, 'state', emptyState, (s) => {
        const items = Array.isArray(body.awards) ? body.awards : [body.award];
        if (!items.length || items.length > 12) return { abort: true, error: 'Send 1–12 awards at a time' };
        const added = [];
        for (const a of items) {
          const err = validateAward(s, a, today);
          if (err) return { abort: true, error: err };
          const e = { id: b64u(crypto.randomBytes(8)), day: a.day, team: a.team, category: a.category, points: a.points, note: cleanNote(a.note), at: new Date(t).toISOString() };
          s.entries.push(e); added.push(e);
          pushAudit(s, t, 'add', `Day ${e.day} · Team ${e.team} · ${RULES[e.category].label} ${e.points > 0 ? '+' : ''}${e.points}${e.note ? ` (${e.note})` : ''}`);
        }
        s.updated = new Date(t).toISOString();
        return { added };
      });
      if (out.error) return json(422, { error: out.error });
      return json(200, out);
    }

    if (body.action === 'remove') {
      const reason = cleanNote(body.reason);
      if (!reason || reason.length < 3) return json(422, { error: 'Say why you are removing it' });
      const out = await mutate(store, 'state', emptyState, (s) => {
        const e = s.entries.find(x => x.id === body.id);
        if (!e || e.deleted) return { abort: true, error: 'Entry not found' };
        e.deleted = { at: new Date(t).toISOString(), reason };
        s.updated = e.deleted.at;
        pushAudit(s, t, 'remove', `Removed Day ${e.day} · Team ${e.team} · ${RULES[e.category].label} ${e.points} — ${reason}`);
        // the full-team bonus only exists because of a 7/7 colour entry
        if (e.category === 'colour') {
          for (const b of s.entries) {
            if (!b.deleted && b.category === 'full_team' && b.day === e.day && b.team === e.team) {
              b.deleted = { at: e.deleted.at, reason: 'Colour count was removed' };
              pushAudit(s, t, 'remove', `Removed Day ${b.day} · Team ${b.team} · ${RULES.full_team.label} ${b.points} — colour count was removed`);
            }
          }
        }
        return { ok: true };
      });
      if (out.error) return json(422, { error: out.error });
      return json(200, out);
    }

    if (body.action === 'logout_all') {
      await mutate(store, 'state', emptyState, (s) => { s.epoch++; pushAudit(s, t, 'logout_all', 'All scorekeeper sessions signed out'); });
      return json(200, { ok: true });
    }

    if (body.action === 'export') {
      return json(200, { state: current });
    }

    return json(400, { error: 'Unknown action' });
  };
}

function pushAudit(s, t, action, detail) {
  s.audit.push({ at: new Date(t).toISOString(), action, detail });
  if (s.audit.length > AUDIT_KEEP) s.audit.splice(0, s.audit.length - AUDIT_KEEP);
}
