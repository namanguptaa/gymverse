# Instructions for AI coding agents

This file tells AI coding tools (Claude Code, Codex, Cursor, Copilot and others) how to work on GymVerse. Human contributors should read [CONTRIBUTING.md](CONTRIBUTING.md).

## What GymVerse is

A self-hosted gym management app: attendance with check-in and check-out, membership plans and fees, workouts and PRs, body weight, WhatsApp/SMS reminders and reports. One gym per install, one owner login, members use a shared front-desk device.

## Hard rules

- **No npm dependencies and no build step.** The server uses only Node.js built-in modules (`node:http`, `node:sqlite`, `node:crypto`). The front end is plain HTML, CSS and JavaScript.
- **Node.js 22.13 or newer.** Run scripts through `npm`, which passes `--disable-warning=ExperimentalWarning` for `node:sqlite`.
- **Keep the data shape.** Gym data lives in the `docs` table as JSON, grouped by the collections in `server/db.js` (`COLLECTIONS`). Adding a collection means updating `COLLECTIONS` in both `server/db.js` and `public/js/state.js`.
- **Every write must bump `seq`** (use `putDoc`, `deleteDoc` or `importData`) so other devices sync.
- **Interface text is plain, simple English** in sentence case. Errors say what happened and how to fix it.
- **Never log or commit member data.** Nothing from `data/` goes in git.
- **Keep the AGPL notice** (`SPDX-License-Identifier: AGPL-3.0-or-later`) at the top of source files, and keep the "Source code" links in the app.

## Layout

| Path | What it holds |
| --- | --- |
| `server/index.js` | HTTP server, routing, API handlers, static files, security headers |
| `server/db.js` | SQLite schema, documents, sequence numbers, tombstones, import, clear |
| `server/auth.js` | Owner account, scrypt hashing, sessions, sign-in rate limit |
| `server/backup.js` | Daily `VACUUM INTO` backups and pruning |
| `server/demo.js` | Sample gym data for first-run exploration |
| `server/cli.js` | `reset-password` and `backup` commands |
| `public/js/*.js` | Plain scripts sharing one global scope, loaded in the order listed in `public/index.html` |
| `test/api.test.js` | End-to-end API tests using `node:test` |

Front-end flow: `render()` rebuilds `#app` from state using template strings; buttons carry `data-a="action"` and are handled in `act()` in `actions.js`; inputs carry `data-in` and are handled in `events.js`. Saving goes through `save()`/`remove()` in `sync.js`, which updates state, queues an outbox entry and sends it to the server.

## Commands

```bash
npm start        # run on http://localhost:3000
npm run dev      # run and restart when server files change
npm test         # API tests, must pass before finishing
```

## Before you finish a change

1. `npm test` passes.
2. `node --check` passes for every file you edited.
3. The change works on a phone-sized screen (about 390px wide) and on desktop, in light and dark mode.
4. Docs are updated if behaviour, settings or the API changed (`README.md`, `docs/INSTALL.md`, `docs/ARCHITECTURE.md`, `CHANGELOG.md`).
