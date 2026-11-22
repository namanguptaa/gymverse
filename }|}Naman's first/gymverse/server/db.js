/*
 * GymVerse | server/db.js
 * SQLite storage using Node's built-in node:sqlite (no extra packages).
 * Gym data is stored as JSON documents grouped into collections, the same shape the app uses.
 * Every change gets an increasing sequence number so devices can fetch only what changed.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
'use strict';
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { DATA_DIR, DB_FILE } = require('./config');

const COLLECTIONS = ['members', 'plans', 'routines', 'attendance', 'logs', 'settings', 'exercises', 'weights'];
const ID_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
  INSERT OR IGNORE INTO meta (k, v) VALUES ('seq', '0'), ('schema', '1');
  CREATE TABLE IF NOT EXISTS docs (
    c TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
    seq INTEGER NOT NULL, updated_at INTEGER NOT NULL,
    PRIMARY KEY (c, id)
  );
  CREATE INDEX IF NOT EXISTS docs_seq ON docs (seq);
  CREATE TABLE IF NOT EXISTS tombstones (
    c TEXT NOT NULL, id TEXT NOT NULL, seq INTEGER NOT NULL,
    PRIMARY KEY (c, id)
  );
  CREATE INDEX IF NOT EXISTS tomb_seq ON tombstones (seq);
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pass_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
`);

const q = {
  nextSeq: db.prepare("UPDATE meta SET v = CAST(v AS INTEGER) + 1 WHERE k = 'seq' RETURNING CAST(v AS INTEGER) AS seq"),
  curSeq: db.prepare("SELECT CAST(v AS INTEGER) AS seq FROM meta WHERE k = 'seq'"),
  allDocs: db.prepare('SELECT c, id, data FROM docs'),
  upsert: db.prepare(`INSERT INTO docs (c, id, data, seq, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (c, id) DO UPDATE SET data = excluded.data, seq = excluded.seq, updated_at = excluded.updated_at`),
  delDoc: db.prepare('DELETE FROM docs WHERE c = ? AND id = ?'),
  tomb: db.prepare('INSERT INTO tombstones (c, id, seq) VALUES (?, ?, ?) ON CONFLICT (c, id) DO UPDATE SET seq = excluded.seq'),
  untomb: db.prepare('DELETE FROM tombstones WHERE c = ? AND id = ?'),
  changed: db.prepare('SELECT c, id, data FROM docs WHERE seq > ? ORDER BY seq'),
  deleted: db.prepare('SELECT c, id FROM tombstones WHERE seq > ? ORDER BY seq'),
};

function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

const validCollection = (c) => COLLECTIONS.includes(c);
const validId = (id) => typeof id === 'string' && ID_RE.test(id);

function allData() {
  const data = {};
  COLLECTIONS.forEach((c) => { data[c] = {}; });
  for (const row of q.allDocs.all()) {
    if (data[row.c]) data[row.c][row.id] = JSON.parse(row.data);
  }
  return { seq: q.curSeq.get().seq, data };
}

function putDoc(c, id, obj) {
  const json = JSON.stringify(obj);
  return tx(() => {
    const { seq } = q.nextSeq.get();
    q.upsert.run(c, id, json, seq, Date.now());
    q.untomb.run(c, id);
    return seq;
  });
}

function deleteDoc(c, id) {
  return tx(() => {
    const { seq } = q.nextSeq.get();
    q.delDoc.run(c, id);
    q.tomb.run(c, id, seq);
    return seq;
  });
}

function changesSince(since) {
  return tx(() => ({
    seq: q.curSeq.get().seq,
    upserts: q.changed.all(since).map((r) => ({ c: r.c, id: r.id, d: JSON.parse(r.data) })),
    deletes: q.deleted.all(since).map((r) => ({ c: r.c, id: r.id })),
  }));
}

function importData(data) {
  let count = 0;
  tx(() => {
    for (const c of COLLECTIONS) {
      const docs = data[c];
      if (!docs || typeof docs !== 'object') continue;
      for (const [id, obj] of Object.entries(docs)) {
        if (!validId(id) || !obj || typeof obj !== 'object' || Array.isArray(obj)) continue;
        const { seq } = q.nextSeq.get();
        q.upsert.run(c, id, JSON.stringify(obj), seq, Date.now());
        q.untomb.run(c, id);
        count++;
      }
    }
  });
  return count;
}

function clearGymData() {
  let count = 0;
  tx(() => {
    const rows = db.prepare("SELECT c, id FROM docs WHERE c <> 'settings'").all();
    for (const r of rows) {
      const { seq } = q.nextSeq.get();
      q.delDoc.run(r.c, r.id); q.tomb.run(r.c, r.id, seq); count++;
    }
  });
  return count;
}

module.exports = { db, COLLECTIONS, clearGymData, validCollection, validId, allData, putDoc, deleteDoc, changesSince, importData, tx };
