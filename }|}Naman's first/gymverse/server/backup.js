/*
 * GymVerse | server/backup.js
 * Saves a full copy of the database to data/backups once a day and keeps the newest BACKUP_KEEP copies.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { db } = require('./db');
const { BACKUP_DIR, BACKUP_KEEP } = require('./config');

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function backupNow({ force = false } = {}) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `gymverse-${stamp()}${force ? '-' + Date.now() : ''}.db`);
  if (!force && fs.existsSync(file)) return null;
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  prune();
  return file;
}

function prune() {
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => /^gymverse-.*\.db$/.test(f)).sort().reverse();
  files.slice(Math.max(BACKUP_KEEP, 1)).forEach((f) => fs.rmSync(path.join(BACKUP_DIR, f), { force: true }));
}

function scheduleBackups(log = console.log) {
  const run = () => {
    try { const f = backupNow(); if (f) log(`Backup saved: ${path.basename(f)}`); }
    catch (e) { console.error('Backup failed:', e.message); }
  };
  run();
  setInterval(run, 3600000).unref(); // checks hourly, writes once per day
}

module.exports = { backupNow, scheduleBackups };
