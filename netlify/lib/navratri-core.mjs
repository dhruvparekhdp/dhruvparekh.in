// Navratri at VoloFin — scoreboard logic.
//
// Everything that matters for fairness happens here on the server:
// the browser only ever *asks* for points to be added, and every
// request is re-checked against the rules below. Storage is a single
// JSON "file" in Netlify Blobs; a second blob tracks login failures.
//
// Scorekeeper login is fixed (user "dhruv"). The repo is public, so only a
// slow scrypt hash of the password lives here, never the password itself.
// The session-signing secret is generated on first use and kept only in
// Blobs, so nobody can forge a session from the source code.
// Optional overrides (Netlify env): NAVRATRI_ADMIN_USER, NAVRATRI_ADMIN_PASSWORD.

import crypto from 'node:crypto';

// Bump together with APP_VERSION in navratri/index.html; open pages reload when it changes.
export const APP_VERSION = 13;
export const TEAMS = [1, 2, 3, 4, 5, 6];
// day -> hosting team (from the Navratri poster); 0 = no host
export const HOST = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 0, 8: 0, 9: 6 };
export const OFFICE_DAYS = [2, 3, 4, 5, 6, 9];
export const DAY_DATES = {
  1: '2026-10-11', 2: '2026-10-12', 3: '2026-10-13', 4: '2026-10-14', 5: '2026-10-15',
  6: '2026-10-16', 7: '2026-10-17', 8: '2026-10-18', 9: '2026-10-19',
};
export const ROSTER = {
  1: ['Jagjit Singh Vasir', 'Gautam Pandurang Murkunde', 'Nikunj Kapri', 'Shobha Das', 'Soniya Singh', 'Jayashree Khade', 'Chrisann Fernandes'],
  2: ['Jatin Chugh', 'Jyoti Dattatraya Nanaware', 'Vaishnavi Dattatray Devgire', 'Kuriakose T Babu', 'Varsha Bagul', 'Ramjeet Yadav', 'Divya Ghatkar'],
  3: ['Siddhesh Kishor Patel', 'Sagar Belose', 'Shubham Gaonkar', 'Dipesh Dalvi', 'Pragati Bohra', 'Saloni Jethva', 'Dhruv Atul Parekh'],
  4: ['Pravin Diwale', 'Sachi Pasari', 'Sakshi Devidas Bhapkar', 'Eliya Patole', 'Gaurav Sattegeri', 'Akash Yadav', 'Vinod Sharma'],
  5: ['Pranav Dongare', 'Nishant Mehta', 'Sujata Gupta', 'Chinmay Joshi', 'Sejal Jadiyar', 'Dheeraj Mishra', 'Shubham Laxman Gaikwad'],
  6: ['Sahil Deepak Gupta', 'Clarissa Fernandes', 'Prerak Dedhia', 'Pravin Balkrushna Ambre', 'Krutika Ashok Sawant', 'Sejal Indrapalsingh Yadav', 'Machindra Padmaker Mhatre'],
};
const teamOfName = (n) => +(Object.keys(ROSTER).find(t => ROSTER[t].includes(n)) || 0);

// Fun, office-safe forfeits for people who skipped the colour of the day.
// The server picks one at random so nobody can choose a friend's forfeit.
export const PUNISHMENTS = [
  'Do Garba like a robot for 20 seconds 🤖',
  'Propose marriage to your office chair 💍',
  'Give a motivational speech to the office water bottle 🎤',
  'Act like your salary just got doubled 💸',
  'Walk like a fashion model wearing an imaginary Navratri outfit 👑',
  'Imitate your favourite Bollywood actor for 15 seconds 🎬',
  'Sing the company name in a romantic song tune 🎶',
  'Act like you have seen your appraisal letter 😱',
  'Do a dramatic slow-motion entry into the room 🕺',
  'Make everyone laugh without saying a word 😂',
  'Give a fake resignation speech and then ask for a promotion 😜',
  'Perform Garba while pretending you are on a conference call 📞',
  'Deliver a weather report about the office AC 🌨️',
  'Give a 20-second speech thanking your chai/coffee ☕',
  'Act like a celebrity being interviewed about office life 🎥',
];
export const TEAM_SIZE = 7;

// Scoring agreed by the cultural team (whiteboard, Day 2):
//   Dress code  1 point per person per office day → 6 per person, 42 per team
//   Snacks      0–10, host team on its day
//   Extra bonus up to 8 per team for the whole festival (for something extraordinary)
//   Penalty     minus points for not doing the task, with a public reason
export const EXTRA_BONUS_CAP = 8;
export const RULES = {
  colour:      { label: 'Dress code',    min: 1,   max: 1,  perPerson: true },
  snack:       { label: 'Snacks',        min: 0,   max: 10, once: true, hostOnly: true },
  extra_bonus: { label: 'Extra bonus',   min: 1,   max: EXTRA_BONUS_CAP, noteRequired: true },
  penalty:     { label: 'Task not done', min: -15, max: -1, noteRequired: true },
};
// Earlier categories stay readable so any entries made before the change still show.
const LEGACY_LABELS = {
  full_team: 'Full-team colour bonus', extra_effort: 'Extra colour effort', creativity: 'Snack creativity',
  traditional: 'Traditional wear', bingo: 'Bingo winner', other: 'Judges’ special',
};
const labelOf = (cat) => (RULES[cat] && RULES[cat].label) || LEGACY_LABELS[cat] || cat;

const SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_GLOBAL = 30;
const MAX_BODY_BYTES = 16384;
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
  return { entries: [], defaulters: [], audit: [], epoch: 1, updated: null };
}

const ADMIN_USER = 'dhruv';
// scrypt(N=2^15, r=8, p=1) of the scorekeeper password — salt:hash
const ADMIN_PASS_SCRYPT = 'c9bf60d6fa26864be59fa42458b64368:1fcf150db916648950d834cd86068c8fc3b3e3ec65ec275d448cfdce58972838';
const SCRYPT_OPTS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function passwordMatches(env, given) {
  if (typeof given !== 'string' || given.length > 200) return false;
  if (env.NAVRATRI_ADMIN_PASSWORD) return safeEqual(given, env.NAVRATRI_ADMIN_PASSWORD);
  const [salt, hash] = ADMIN_PASS_SCRYPT.split(':');
  const got = crypto.scryptSync(given, salt, 32, SCRYPT_OPTS);
  return crypto.timingSafeEqual(got, Buffer.from(hash, 'hex'));
}

// Random signing secret, created once and kept only in Blobs.
async function sessionSecret(store) {
  const existing = await store.get('secret', { type: 'text' });
  if (existing) return existing;
  await store.set('secret', crypto.randomBytes(32).toString('hex'), { onlyIfNew: true });
  return store.get('secret', { type: 'text' });
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
      id: e.id, day: e.day, team: e.team, name: e.name || null, category: e.category, points: e.points,
      note: e.note || '', at: e.at, deleted: e.deleted ? { at: e.deleted.at, reason: e.deleted.reason } : null,
    })),
    defaulters: (state.defaulters || []).filter(d => !d.deleted).map(d => ({
      id: d.id, day: d.day, name: d.name, team: d.team, punishment: d.punishment || null, at: d.at,
    })),
    audit: state.audit.slice(-60).map(a => ({ at: a.at, action: a.action, detail: a.detail })),
    updated: state.updated,
    today: todayIST(now),
    version: APP_VERSION,
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
  const { day, category, points } = a;
  if (!Number.isInteger(day) || day < 1 || day > 9) return 'Day must be 1–9';
  const rule = RULES[category];
  if (!rule) return 'Unknown category';
  if (rule.perPerson) {
    if (typeof a.name !== 'string' || !teamOfName(a.name)) return 'Only names from the team list are allowed';
    if (a.team !== teamOfName(a.name)) return `${a.name} is in Team ${teamOfName(a.name)}`;
  }
  const team = a.team;
  if (!Number.isInteger(team) || !TEAMS.includes(team)) return 'Team must be 1–6';
  if (!Number.isInteger(points)) return 'Points must be a whole number';
  if (!OFFICE_DAYS.includes(day)) return `Day ${day} is not an office day`;
  if (DAY_DATES[day] > today) return `Day ${day} hasn’t happened yet — no advance scoring`;
  if (points < rule.min || points > rule.max) {
    return `${rule.label}: points must be ${rule.min === rule.max ? rule.min : `${rule.min} to ${rule.max}`}`;
  }
  if (rule.hostOnly && HOST[day] !== team) return `${rule.label} is only for the hosting team (Team ${HOST[day]} on Day ${day})`;
  const note = cleanNote(a.note);
  if (note === null) return 'Note must be text';
  if (rule.noteRequired && note.length < 3) return `${rule.label} needs a short reason`;
  const live = state.entries.filter(e => !e.deleted);
  if (rule.perPerson) {
    if (live.some(e => e.day === day && e.category === category && e.name === a.name)) return `${a.name} already has the Day ${day} dress-code point`;
    if ((state.defaulters || []).some(d => !d.deleted && d.day === day && d.name === a.name)) {
      return `${a.name} is on the Day ${day} Colour Police list — remove them there first`;
    }
  }
  if (rule.once && live.some(e => e.day === day && e.team === team && e.category === category)) {
    return `Team ${team} already has “${rule.label}” for Day ${day}. Remove the old entry first.`;
  }
  if (category === 'extra_bonus') {
    const used = live.filter(e => e.team === team && e.category === 'extra_bonus').reduce((n, e) => n + e.points, 0);
    if (used + points > EXTRA_BONUS_CAP) return `Team ${team} has ${EXTRA_BONUS_CAP - used} extra-bonus points left (max ${EXTRA_BONUS_CAP} for the festival)`;
  }
  return null;
}

export function createHandler({ store, env, now = () => Date.now() }) {
  const adminUser = env.NAVRATRI_ADMIN_USER || ADMIN_USER;

  return async function handle(req, ip = '0.0.0.0') {
    const t = now();
    const secret = await sessionSecret(store);
    const ipId = ipTag(secret, ip);

    if (req.method === 'GET') {
      const state = (await store.get('state', { type: 'json' })) || emptyState();
      return json(200, publicView(state, t));
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

    // ── login: brute-force protected ──
    if (body.action === 'login') {
      const auth = (await store.get('auth', { type: 'json' })) || { ips: {}, global: [] };
      const recent = (arr) => (arr || []).filter(x => t - x < FAIL_WINDOW_MS);
      auth.global = recent(auth.global);
      const mine = recent(auth.ips[ipId]);
      if (mine.length >= MAX_FAILS_PER_IP || auth.global.length >= MAX_FAILS_GLOBAL) {
        return json(429, { error: 'Too many wrong attempts. Login is locked for 15 minutes.' });
      }
      const userOk = safeEqual(typeof body.user === 'string' ? body.user.trim().toLowerCase() : '', adminUser);
      const passOk = passwordMatches(env, body.password);
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
      return json(200, { token: signToken(secret, { exp, epoch, n: b64u(crypto.randomBytes(9)) }), exp });
    }

    // ── everything below needs a valid session ──
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const current = (await store.get('state', { type: 'json' })) || emptyState();
    if (!verifyToken(secret, token, current.epoch, t)) return json(401, { error: 'Session expired — please sign in again' });
    const today = todayIST(t);

    if (body.action === 'add') {
      const out = await mutate(store, 'state', emptyState, (s) => {
        const items = Array.isArray(body.awards) ? body.awards : [body.award];
        if (!items.length || items.length > 50) return { abort: true, error: 'Send 1–50 awards at a time' };
        const added = [];
        for (const a of items) {
          const err = validateAward(s, a, today);
          if (err) return { abort: true, error: err };
          const e = { id: b64u(crypto.randomBytes(8)), day: a.day, team: a.team, category: a.category, points: a.points, note: cleanNote(a.note), at: new Date(t).toISOString() };
          if (RULES[a.category].perPerson) e.name = a.name;
          s.entries.push(e); added.push(e);
          }
        // one audit line per batch keeps the log readable for 42-person roll-calls
        const people = added.filter(e => e.name);
        if (people.length) pushAudit(s, t, 'add', `Day ${people[0].day} · Dress code +1 each: ${people.map(e => e.name).join(', ')}`);
        for (const e of added.filter(e => !e.name)) pushAudit(s, t, 'add', `Day ${e.day} · Team ${e.team} · ${labelOf(e.category)} ${e.points > 0 ? '+' : ''}${e.points}${e.note ? ` (${e.note})` : ''}`);
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
        pushAudit(s, t, 'remove', `Removed Day ${e.day} · Team ${e.team}${e.name ? ` · ${e.name}` : ''} · ${labelOf(e.category)} ${e.points} — ${reason}`);
        // the full-team bonus only exists because of a 7/7 colour entry
        if (e.category === 'colour') {
          for (const b of s.entries) {
            if (!b.deleted && b.category === 'full_team' && b.day === e.day && b.team === e.team) {
              b.deleted = { at: e.deleted.at, reason: 'Colour count was removed' };
              pushAudit(s, t, 'remove', `Removed Day ${b.day} · Team ${b.team} · ${labelOf('full_team')} ${b.points} — colour count was removed`);
            }
          }
        }
        return { ok: true };
      });
      if (out.error) return json(422, { error: out.error });
      return json(200, out);
    }

    // ── colour defaulters + random forfeit ──
    if (body.action === 'defaulters_add') {
      const day = body.day;
      if (!Number.isInteger(day) || !OFFICE_DAYS.includes(day)) return json(422, { error: 'Pick an office day' });
      if (DAY_DATES[day] > today) return json(422, { error: 'That day hasn’t happened yet' });
      const names = Array.isArray(body.names) ? body.names : [];
      if (!names.length || names.length > 42) return json(422, { error: 'Pick at least one person' });
      if (names.some(n => typeof n !== 'string' || !teamOfName(n))) return json(422, { error: 'Only names from the team list are allowed' });
      const out = await mutate(store, 'state', emptyState, (s) => {
        s.defaulters = s.defaulters || [];
        const scored = names.find(n => s.entries.some(e => !e.deleted && e.day === day && e.category === 'colour' && e.name === n));
        if (scored) return { abort: true, error: `${scored} already has the Day ${day} dress-code point — remove it first` };
        const added = [];
        for (const name of new Set(names)) {
          if (s.defaulters.some(d => !d.deleted && d.day === day && d.name === name)) continue;
          const d = { id: b64u(crypto.randomBytes(8)), day, name, team: teamOfName(name), punishment: null, at: new Date(t).toISOString() };
          s.defaulters.push(d); added.push(d);
        }
        if (added.length) pushAudit(s, t, 'defaulter', `Day ${day} · not in colour: ${added.map(d => d.name).join(', ')}`);
        s.updated = new Date(t).toISOString();
        return { added: added.length };
      });
      if (out.error) return json(422, { error: out.error });
      return json(200, out);
    }

    if (body.action === 'defaulter_remove') {
      const reason = cleanNote(body.reason);
      if (!reason || reason.length < 3) return json(422, { error: 'Say why you are removing it' });
      const out = await mutate(store, 'state', emptyState, (s) => {
        const d = (s.defaulters || []).find(x => x.id === body.id && !x.deleted);
        if (!d) return { abort: true, error: 'Not found' };
        d.deleted = { at: new Date(t).toISOString(), reason };
        pushAudit(s, t, 'remove', `Removed ${d.name} from Day ${d.day} colour defaulters — ${reason}`);
        return { ok: true };
      });
      if (out.error) return json(422, { error: out.error });
      return json(200, out);
    }

    if (body.action === 'spin') {
      const out = await mutate(store, 'state', emptyState, (s) => {
        const d = (s.defaulters || []).find(x => x.id === body.id && !x.deleted);
        if (!d) return { abort: true, error: 'Not found' };
        // one spin per person, no re-rolls
        if (d.punishment) return { abort: true, punishment: d.punishment, already: true };
        d.punishment = PUNISHMENTS[crypto.randomInt(PUNISHMENTS.length)];
        pushAudit(s, t, 'spin', `${d.name} (Day ${d.day}) got: ${d.punishment}`);
        s.updated = new Date(t).toISOString();
        return { punishment: d.punishment };
      });
      if (out.error) return json(422, { error: out.error });
      return json(200, out);
    }

    // Undo a spin (e.g. a test or a mistake) so the person can be spun again. Logged publicly.
    if (body.action === 'unspin') {
      const reason = cleanNote(body.reason);
      if (!reason || reason.length < 3) return json(422, { error: 'Say why you are undoing it' });
      const out = await mutate(store, 'state', emptyState, (s) => {
        const d = (s.defaulters || []).find(x => x.id === body.id && !x.deleted);
        if (!d) return { abort: true, error: 'Not found' };
        if (!d.punishment) return { abort: true, error: 'Nothing to undo — not spun yet' };
        pushAudit(s, t, 'unspin', `Undid ${d.name}’s forfeit (Day ${d.day}: ${d.punishment}) — ${reason}`);
        d.punishment = null;
        s.updated = new Date(t).toISOString();
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
