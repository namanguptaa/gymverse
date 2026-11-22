/*
 * GymVerse | server/auth.js
 * Owner account, password hashing (scrypt) and sign-in sessions (HttpOnly cookie).
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
'use strict';
const crypto = require('node:crypto');
const { db } = require('./db');
const { SESSION_DAYS, COOKIE_SECURE } = require('./config');

const COOKIE = 'gv_session';
const DAY = 86400000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  const [kind, saltB64, hashB64] = String(stored).split('$');
  if (kind !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(actual, expected);
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const q = {
  countUsers: db.prepare('SELECT COUNT(*) AS n FROM users'),
  userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  userById: db.prepare('SELECT id, email FROM users WHERE id = ?'),
  firstUser: db.prepare('SELECT * FROM users ORDER BY id LIMIT 1'),
  addUser: db.prepare('INSERT INTO users (email, pass_hash, created_at) VALUES (?, ?, ?)'),
  setPass: db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?'),
  addSession: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'),
  getSession: db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?'),
  touchSession: db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?'),
  delSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  delUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
  purge: db.prepare('DELETE FROM sessions WHERE expires_at < ?'),
};

const needsSetup = () => q.countUsers.get().n === 0;
const validEmail = (e) => typeof e === 'string' && e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function createOwner(email, password) {
  const info = q.addUser.run(email.trim(), hashPassword(password), Date.now());
  return { id: Number(info.lastInsertRowid), email: email.trim() };
}

function checkLogin(email, password) {
  const u = q.userByEmail.get(String(email || '').trim());
  if (!u) { hashPassword(String(password || 'x')); return null; } // keep timing similar
  return verifyPassword(String(password || ''), u.pass_hash) ? { id: u.id, email: u.email } : null;
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  q.addSession.run(sha(token), userId, now, now + SESSION_DAYS * DAY);
  return token;
}

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function sessionUser(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;
  const s = q.getSession.get(sha(token));
  if (!s || s.expires_at < Date.now()) return null;
  // extend the session while it's being used (at most once a day)
  const fresh = Date.now() + SESSION_DAYS * DAY;
  if (fresh - s.expires_at > DAY) q.touchSession.run(fresh, sha(token));
  const u = q.userById.get(s.user_id);
  return u ? { id: u.id, email: u.email, token } : null;
}

function endSession(token) { if (token) q.delSession.run(sha(token)); }

function cookieHeader(token, req) {
  const secure = COOKIE_SECURE || req.headers['x-forwarded-proto'] === 'https';
  const base = `${COOKIE}=${token ? encodeURIComponent(token) : ''}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
  return token ? `${base}; Max-Age=${SESSION_DAYS * 86400}` : `${base}; Max-Age=0`;
}

function changePassword(userId, password) {
  q.setPass.run(hashPassword(password), userId);
}

function resetPassword(email, password) {
  const u = email ? q.userByEmail.get(email) : q.firstUser.get();
  if (!u) return null;
  q.setPass.run(hashPassword(password), u.id);
  q.delUserSessions.run(u.id); // sign out everywhere
  return u.email;
}

// Simple in-memory limit: 10 failed sign-ins per IP every 15 minutes.
const attempts = new Map();
function tooManyAttempts(ip) {
  const a = attempts.get(ip);
  if (!a) return false;
  if (Date.now() > a.until) { attempts.delete(ip); return false; }
  return a.count >= 10;
}
function noteFailure(ip) {
  const a = attempts.get(ip) || { count: 0, until: Date.now() + 15 * 60000 };
  a.count++; attempts.set(ip, a);
}
const clearFailures = (ip) => attempts.delete(ip);

setInterval(() => q.purge.run(Date.now()), 6 * 3600000).unref();

module.exports = {
  needsSetup, validEmail, createOwner, checkLogin, createSession, sessionUser, endSession, cookieHeader,
  verifyPassword, changePassword, resetPassword, tooManyAttempts, noteFailure, clearFailures, q,
};
