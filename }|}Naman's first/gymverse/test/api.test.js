/*
 * GymVerse | test/api.test.js
 * End-to-end API checks. Run with: npm test
 */
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 3999 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gymverse-test-'));
let server; let cookie = '';

async function call(p, { method = 'GET', body } = {}) {
  const headers = { cookie };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const r = await fetch(BASE + p, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const set = r.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
  return { status: r.status, json: await r.json().catch(() => null) };
}

before(async () => {
  server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.js'], {
    env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', DATA_DIR: dataDir }, stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try { await fetch(BASE + '/api/health'); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('server did not start');
});
after(() => { server.kill(); fs.rmSync(dataDir, { recursive: true, force: true }); });

test('first run needs setup', async () => {
  const r = await call('/api/status');
  assert.equal(r.json.needsSetup, true);
});

test('data is protected before sign-in', async () => {
  assert.equal((await call('/api/data')).status, 401);
});

test('setup creates the owner and signs in', async () => {
  const r = await call('/api/setup', { method: 'POST', body: { email: 'owner@example.com', password: 'secret123', gymName: 'Test Gym' } });
  assert.equal(r.status, 200);
  assert.equal((await call('/api/setup', { method: 'POST', body: { email: 'x@y.z', password: 'secret123' } })).status, 409);
});

test('save, sync and delete records', async () => {
  const start = (await call('/api/data')).json;
  assert.equal(start.data.settings.main.gymName, 'Test Gym');
  assert.equal((await call('/api/docs/members/m1', { method: 'PUT', body: { name: 'Ravi' } })).status, 200);
  const ch = (await call('/api/changes?since=' + start.seq)).json;
  assert.deepEqual(ch.upserts.map((u) => u.id), ['m1']);
  await call('/api/docs/members/m1', { method: 'DELETE', body: {} });
  const ch2 = (await call('/api/changes?since=' + ch.seq)).json;
  assert.deepEqual(ch2.deletes.map((d) => d.id), ['m1']);
});

test('clearing sample data removes gym records but keeps settings', async () => {
  await call('/api/docs/members/m2', { method: 'PUT', body: { name: 'Asha' } });
  const r = await call('/api/demo/clear', { method: 'POST', body: {} });
  assert.equal(r.status, 200);
  const all = (await call('/api/data')).json;
  assert.deepEqual(Object.keys(all.data.members), []);
  assert.equal(all.data.settings.main.gymName, 'Test Gym');
});

test('rejects bad input', async () => {
  assert.equal((await call('/api/docs/hackers/x', { method: 'PUT', body: {} })).status, 404);
  assert.equal((await call('/api/docs/members/' + encodeURIComponent('../x'), { method: 'PUT', body: {} })).status, 400);
});

test('wrong password is refused, right one works', async () => {
  const keep = cookie; cookie = '';
  assert.equal((await call('/api/login', { method: 'POST', body: { email: 'owner@example.com', password: 'nope' } })).status, 401);
  assert.equal((await call('/api/login', { method: 'POST', body: { email: 'owner@example.com', password: 'secret123' } })).status, 200);
  cookie = cookie || keep;
});

test('a daily backup file is written', async () => {
  const files = fs.readdirSync(path.join(dataDir, 'backups'));
  assert.ok(files.some((f) => /^gymverse-\d{4}-\d{2}-\d{2}\.db$/.test(f)));
});
