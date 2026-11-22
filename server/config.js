/*
 * GymVerse | server/config.js
 * Settings read from environment variables (or a .env file in the project root).
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

// Load KEY=value lines from .env without overwriting real environment variables.
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

const int = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);
const bool = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));

const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || 'data');

module.exports = {
  ROOT,
  PUBLIC_DIR: path.join(ROOT, 'public'),
  DATA_DIR,
  DB_FILE: path.join(DATA_DIR, 'gymverse.db'),
  BACKUP_DIR: path.join(DATA_DIR, 'backups'),
  HOST: process.env.HOST || '0.0.0.0',
  PORT: int(process.env.PORT, 3000),
  BACKUP_KEEP: int(process.env.BACKUP_KEEP, 30),      // how many daily backups to keep
  SESSION_DAYS: int(process.env.SESSION_DAYS, 90),     // how long a sign-in lasts
  COOKIE_SECURE: bool(process.env.COOKIE_SECURE, false), // set true when served over HTTPS
  TRUST_PROXY: bool(process.env.TRUST_PROXY, false),   // true behind Nginx/Caddy/Traefik
};
