// Catches syntax errors in the page's inline script (e.g. a variable declared twice),
// which would otherwise break the whole live page. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('inline page script compiles', () => {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.ok(scripts.length > 0, 'no inline script found');
  for (const code of scripts) assert.doesNotThrow(() => new vm.Script(code), 'page script has a syntax error');
});

test('page and server agree on APP_VERSION', () => {
  const core = readFileSync(new URL('../../netlify/lib/navratri-core.mjs', import.meta.url), 'utf8');
  const page = html.match(/const APP_VERSION = (\d+);/)[1];
  const server = core.match(/export const APP_VERSION = (\d+);/)[1];
  assert.equal(page, server);
});
