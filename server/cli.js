/*
 * GymVerse | server/cli.js
 * Maintenance commands, run on the server:
 *   npm run reset-password -- [email]   Set a new owner password (signs out all devices)
 *   npm run backup                      Save a backup copy of the database right now
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
'use strict';
const readline = require('node:readline');
const [cmd, arg] = process.argv.slice(2);

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a); });
  });
}

(async () => {
  if (cmd === 'reset-password') {
    const auth = require('./auth');
    if (auth.needsSetup()) { console.log('No owner account yet. Open GymVerse in a browser to create one.'); process.exit(1); }
    const pass = process.env.NEW_PASSWORD || await ask('New owner password (at least 8 characters): ', true);
    if (!pass || pass.length < 8) { console.log('Password must be at least 8 characters.'); process.exit(1); }
    const email = auth.resetPassword(arg || null, pass);
    if (!email) { console.log(`No owner account found${arg ? ' for ' + arg : ''}.`); process.exit(1); }
    console.log(`Password changed for ${email}. All devices have been signed out.`);
  } else if (cmd === 'backup') {
    const { backupNow } = require('./backup');
    console.log(`Backup saved: ${backupNow({ force: true })}`);
  } else {
    console.log('Commands:\n  npm run reset-password -- [email]\n  npm run backup');
    process.exit(1);
  }
})();
