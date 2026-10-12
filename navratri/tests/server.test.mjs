// Server rule tests for the Navratri scoreboard. Run: npm test
// Uses an in-memory stand-in for Netlify Blobs, so no network or Netlify account is needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../../netlify/lib/navratri-core.mjs';

function memoryStore() {
  const mem = new Map(); let ver = 0;
  return {
    async get(k) { const v = mem.get(k); return v ? structuredClone(v.d) : null; },
    async set(k, d, o = {}) { if (o.onlyIfNew && mem.has(k)) return { modified: false }; mem.set(k, { d, e: String(++ver) }); return { modified: true }; },
    async getWithMetadata(k) { const v = mem.get(k); return v ? { data: structuredClone(v.d), etag: v.e } : null; },
    async setJSON(k, d, o = {}) {
      const v = mem.get(k);
      if (o.onlyIfNew && v) return { modified: false };
      if (o.onlyIfMatch && (!v || v.e !== o.onlyIfMatch)) return { modified: false };
      mem.set(k, { d: structuredClone(d), e: String(++ver) }); return { modified: true };
    },
  };
}

// Tuesday 13 Oct 2026, 6 PM IST = Day 3 (Red, Team 2 hosts)
const NOW = Date.parse('2026-10-13T18:00:00+05:30');
const ORIGIN = 'https://dhruvparekh.in';

function setup() {
  const h = createHandler({ store: memoryStore(), env: {}, now: () => NOW });
  const call = async (body, { token, ip = '1.2.3.4', origin = ORIGIN } = {}) => {
    const r = await h(new Request(ORIGIN + '/api/navratri', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin, ...(token ? { authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(body),
    }), ip);
    return { status: r.status, body: await r.json() };
  };
  const get = async () => (await h(new Request(ORIGIN + '/api/navratri'), '9.9.9.9')).json();
  const login = async () => {
    // the real password is only known to the cultural team; tests read it from the env
    const password = process.env.NAVRATRI_TEST_PASSWORD;
    if (!password) return null;
    return (await call({ action: 'login', user: 'dhruv', password })).body.token;
  };
  return { call, get, login };
}
const dress = (name, team, day = 3) => ({ day, team, category: 'colour', points: 1, name });
const needsPassword = !process.env.NAVRATRI_TEST_PASSWORD && 'set NAVRATRI_TEST_PASSWORD to run logged-in tests';

test('public read works and has no cheers', async () => {
  const { get } = setup();
  const g = await get();
  assert.deepEqual(g.entries, []);
  assert.equal('cheers' in g, false);
  assert.equal(typeof g.version, 'number');
});

test('cross-site and anonymous writes are refused', async () => {
  const { call } = setup();
  assert.equal((await call({ action: 'login', user: 'dhruv', password: 'x' }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await call({ action: 'add', awards: [dress('Dhruv Atul Parekh', 3)] })).status, 401);
  assert.equal((await call({ action: 'add', awards: [dress('Dhruv Atul Parekh', 3)] }, { token: 'forged.token' })).status, 401);
});

test('wrong logins lock out after 5 tries', async () => {
  const { call } = setup();
  for (let i = 0; i < 5; i++) assert.equal((await call({ action: 'login', user: 'dhruv', password: 'wrong' + i })).status, 401);
  assert.equal((await call({ action: 'login', user: 'dhruv', password: 'anything' })).status, 429);
});

test('scoring rules', { skip: needsPassword }, async () => {
  const { call, get, login } = setup();
  const token = await login();
  assert.ok(token, 'login failed');
  const add = (a) => call({ action: 'add', awards: [].concat(a) }, { token });

  assert.equal((await add([dress('Dhruv Atul Parekh', 3), dress('Jatin Chugh', 2)])).status, 200);
  assert.match((await add(dress('Dhruv Atul Parekh', 3))).body.error, /already has/);
  assert.match((await add(dress('Jatin Chugh', 5))).body.error, /is in Team 2/);
  assert.match((await add(dress('Evil Tester', 1))).body.error, /team list/);
  assert.match((await add({ ...dress('Sagar Belose', 3), points: 2 })).body.error, /must be 1/);
  assert.match((await add(dress('Sagar Belose', 3, 4))).body.error, /hasn’t happened/);

  assert.equal((await add({ day: 3, team: 2, category: 'snack', points: 10 })).status, 200);
  assert.match((await add({ day: 3, team: 1, category: 'snack', points: 8 })).body.error, /hosting team/);
  assert.match((await add({ day: 2, team: 1, category: 'snack', points: 11 })).body.error, /0 to 10/);

  assert.equal((await add({ day: 3, team: 4, category: 'extra_bonus', points: 7, note: 'Live dhol' })).status, 200);
  assert.match((await add({ day: 2, team: 4, category: 'extra_bonus', points: 2, note: 'Rangoli' })).body.error, /1 extra-bonus points left/);
  assert.match((await add({ day: 2, team: 5, category: 'extra_bonus', points: 3 })).body.error, /reason/);

  const g = await get();
  const total = (t) => g.entries.filter(e => !e.deleted && e.team === t).reduce((n, e) => n + e.points, 0);
  assert.equal(total(2), 11);
  assert.equal(total(3), 1);
  assert.equal(total(4), 7);
});

test('attendance, forfeit spin and undo', { skip: needsPassword }, async () => {
  const { call, get, login } = setup();
  const token = await login();
  assert.equal((await call({ action: 'defaulters_add', day: 3, names: ['Nikunj Kapri'] }, { token })).status, 200);
  // someone on the Colour Police list can't also get the dress point
  assert.match((await call({ action: 'add', awards: [dress('Nikunj Kapri', 1)] }, { token })).body.error, /Colour Police/);
  const id = (await get()).defaulters[0].id;
  const first = (await call({ action: 'spin', id }, { token })).body.punishment;
  assert.ok(first);
  assert.equal((await call({ action: 'spin', id }, { token })).body.punishment, first, 'no re-roll without undo');
  assert.match((await call({ action: 'unspin', id }, { token })).body.error, /why/);
  assert.equal((await call({ action: 'unspin', id, reason: 'was a test' }, { token })).status, 200);
  assert.equal((await get()).defaulters[0].punishment, null);
  assert.ok((await call({ action: 'spin', id }, { token })).body.punishment);
  assert.ok((await get()).audit.some(a => a.action === 'unspin'));
});

test('absent marks: exclusive with ✗ and ✓, removable with a reason', { skip: needsPassword }, async () => {
  const { call, get, login } = setup();
  const token = await login();
  assert.equal((await call({ action: 'absent_add', day: 3, names: ['Varsha Bagul', 'Divya Ghatkar'] }, { token })).status, 200);
  assert.match((await call({ action: 'defaulters_add', day: 3, names: ['Varsha Bagul'] }, { token })).body.error, /absent/);
  assert.equal((await call({ action: 'defaulters_add', day: 3, names: ['Jatin Chugh'] }, { token })).status, 200);
  assert.match((await call({ action: 'absent_add', day: 3, names: ['Jatin Chugh'] }, { token })).body.error, /✗/);
  assert.match((await call({ action: 'absent_add', day: 4, names: ['Jatin Chugh'] }, { token })).body.error, /hasn’t happened/);
  assert.match((await call({ action: 'absent_add', day: 3, names: ['Not A Person'] }, { token })).body.error, /team list/);
  assert.equal((await call({ action: 'absent_add', day: 3, names: ['Varsha Bagul'] })).status, 401);
  const g = await get();
  assert.deepEqual(g.absentees.map(a => a.name).sort(), ['Divya Ghatkar', 'Varsha Bagul']);
  assert.ok(g.now);
  const id = g.absentees.find(a => a.name === 'Divya Ghatkar').id;
  assert.match((await call({ action: 'absent_remove', id }, { token })).body.error, /why/);
  assert.equal((await call({ action: 'absent_remove', id, reason: 'she came in late' }, { token })).status, 200);
  assert.deepEqual((await get()).absentees.map(a => a.name), ['Varsha Bagul']);
});
