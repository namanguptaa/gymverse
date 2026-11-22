/*
 * GymVerse | server/index.js
 * A small web server: serves the app from /public and a JSON API under /api.
 * Uses only Node.js built-in modules. Start with: npm start
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const store = require('./db');
const auth = require('./auth');
const { scheduleBackups } = require('./backup');
const { buildDemo } = require('./demo');
const pkg = require('../package.json');

const MAX_BODY = 10 * 1024 * 1024; // 10 MB (large enough for a full backup restore)

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  const payload = isJson ? JSON.stringify(body) : body;
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}
const fail = (res, status, error) => send(res, status, { error });

function clientIp(req) {
  if (config.TRUST_PROXY) {
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (fwd) return fwd;
  }
  return req.socket.remoteAddress || 'unknown';
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('Request is too large.'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('Invalid JSON.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

// Blocks requests from other websites (CSRF): writes must be JSON and same-origin.
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = req.headers['x-forwarded-host'] && config.TRUST_PROXY ? req.headers['x-forwarded-host'] : req.headers.host;
    return new URL(origin).host === host;
  } catch { return false; }
}

async function handleApi(req, res, url) {
  const method = req.method;
  const route = url.pathname.replace(/\/+$/, '');

  if (method !== 'GET' && method !== 'HEAD') {
    if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request blocked.');
    if (!String(req.headers['content-type'] || '').includes('application/json')) return fail(res, 415, 'Send JSON.');
  }

  if (route === '/api/health' && method === 'GET') return send(res, 200, { ok: true, version: pkg.version });

  if (route === '/api/status' && method === 'GET') {
    const u = auth.sessionUser(req);
    return send(res, 200, { needsSetup: auth.needsSetup(), user: u ? { email: u.email } : null, version: pkg.version });
  }

  if (route === '/api/setup' && method === 'POST') {
    if (!auth.needsSetup()) return fail(res, 409, 'This GymVerse is already set up. Please sign in.');
    const { email, password, gymName, demo } = await readJson(req);
    if (!auth.validEmail(email)) return fail(res, 400, 'Enter a valid email address.');
    if (typeof password !== 'string' || password.length < 8) return fail(res, 400, 'Use a password with at least 8 characters.');
    const u = auth.createOwner(email, password);
    const name = typeof gymName === 'string' ? gymName.trim().slice(0, 80) : '';
    if (demo === true) store.importData(buildDemo(name || 'Demo Gym'));
    else if (name) store.putDoc('settings', 'main', { gymName: name, pin: '' });
    return send(res, 200, { user: { email: u.email } }, { 'Set-Cookie': auth.cookieHeader(auth.createSession(u.id), req) });
  }

  if (route === '/api/login' && method === 'POST') {
    const ip = clientIp(req);
    if (auth.tooManyAttempts(ip)) return fail(res, 429, 'Too many tries. Wait 15 minutes and try again.');
    const { email, password } = await readJson(req);
    const u = auth.checkLogin(email, password);
    if (!u) { auth.noteFailure(ip); return fail(res, 401, 'Wrong email or password.'); }
    auth.clearFailures(ip);
    return send(res, 200, { user: { email: u.email } }, { 'Set-Cookie': auth.cookieHeader(auth.createSession(u.id), req) });
  }

  // Everything below needs a signed-in owner.
  const user = auth.sessionUser(req);
  if (!user) return fail(res, 401, 'Please sign in.');

  if (route === '/api/logout' && method === 'POST') {
    auth.endSession(user.token);
    return send(res, 200, { ok: true }, { 'Set-Cookie': auth.cookieHeader('', req) });
  }

  if (route === '/api/password' && method === 'POST') {
    const { current, next } = await readJson(req);
    const row = auth.q.userByEmail.get(user.email);
    if (!row || !auth.verifyPassword(String(current || ''), row.pass_hash)) return fail(res, 403, 'The current password isn\u2019t right.');
    if (typeof next !== 'string' || next.length < 8) return fail(res, 400, 'Use a new password with at least 8 characters.');
    auth.changePassword(user.id, next);
    return send(res, 200, { ok: true });
  }

  if (route === '/api/data' && method === 'GET') return send(res, 200, store.allData());

  if (route === '/api/demo/clear' && method === 'POST') {
    const removed = store.clearGymData();
    const cur = store.allData().data.settings.main || {};
    store.putDoc('settings', 'main', { ...cur, demo: false });
    return send(res, 200, { ok: true, removed });
  }

  if (route === '/api/changes' && method === 'GET') {
    const since = Math.max(0, parseInt(url.searchParams.get('since'), 10) || 0);
    return send(res, 200, store.changesSince(since));
  }

  if (route === '/api/import' && method === 'POST') {
    const body = await readJson(req);
    if (!body || typeof body.data !== 'object') return fail(res, 400, 'No backup data found.');
    return send(res, 200, { ok: true, count: store.importData(body.data) });
  }

  const m = route.match(/^\/api\/docs\/([a-z]+)\/([^/]+)$/);
  if (m) {
    const c = m[1]; const id = decodeURIComponent(m[2]);
    if (!store.validCollection(c)) return fail(res, 404, 'Unknown collection.');
    if (!store.validId(id)) return fail(res, 400, 'Invalid record id.');
    if (method === 'PUT') {
      const obj = await readJson(req);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return fail(res, 400, 'Record must be a JSON object.');
      if (JSON.stringify(obj).length > 1024 * 1024) return fail(res, 413, 'Record is too large.');
      return send(res, 200, { ok: true, seq: store.putDoc(c, id, obj) });
    }
    if (method === 'DELETE') return send(res, 200, { ok: true, seq: store.deleteDoc(c, id) });
  }

  return fail(res, 404, 'Not found.');
}

function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'Method not allowed.');
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { return fail(res, 400, 'Bad path.'); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(config.PUBLIC_DIR, rel));
  if (!file.startsWith(config.PUBLIC_DIR + path.sep)) return fail(res, 403, 'Forbidden.');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // unknown paths load the app (it has a single page)
      if (!path.extname(rel)) return serveStatic(req, res, new URL('/', 'http://x'));
      return fail(res, 404, 'Not found.');
    }
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else serveStatic(req, res, url);
  } catch (e) {
    if (!res.headersSent) fail(res, e.status || 500, e.status ? e.message : 'Something went wrong on the server.');
    if (!e.status) console.error(e);
  }
});

server.listen(config.PORT, config.HOST, () => {
  console.log(`GymVerse ${pkg.version} is running at http://localhost:${config.PORT}`);
  console.log(`Data folder: ${config.DATA_DIR}`);
  if (auth.needsSetup()) console.log('First run: open the address above to create the owner account.');
  scheduleBackups();
});

const stop = () => { server.close(() => { try { store.db.close(); } catch {} process.exit(0); }); setTimeout(() => process.exit(0), 3000).unref(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
