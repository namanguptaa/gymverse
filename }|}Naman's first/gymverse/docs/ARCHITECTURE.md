# How GymVerse works

GymVerse has a browser app (`public/`) and a small server (`server/`). Both use only built-in features: the server runs on Node.js with no npm packages, and the app is plain JavaScript with no build step.

## Data model

All gym data is stored as JSON documents grouped into collections, in the SQLite table `docs (c, id, data, seq, updated_at)`.

| Collection | One document per | Example id |
| --- | --- | --- |
| `members` | Member | `lq2x8a1b3c` |
| `plans` | Membership plan | `lq2x9f0d2e` |
| `routines` | Workout routine | `lq2xa7c4f1` |
| `exercises` | Custom exercise | `lq2xb2e9a7` |
| `attendance` | Day | `2026-11-22` |
| `logs` | Member's workout on a day | `<memberId>_2026-11-22` |
| `weights` | Member's body weight history | `<memberId>` |
| `settings` | Gym settings | `main` |

## Syncing between devices

Every save or delete gets an increasing sequence number (`seq`). Deletions are recorded in `tombstones`. A device loads everything once with `GET /api/data`, then asks every 5 seconds for what changed with `GET /api/changes?since=<seq>`.

Changes are written to an outbox in the browser's local storage first, then sent to the server. If the connection drops, the outbox keeps them and sends them later, so nothing typed is lost.

## API

All endpoints except `health`, `status`, `setup` and `login` need a signed-in owner. Requests that change data must send JSON from the same site.

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | Server is up, plus version |
| `GET /api/status` | Whether first-time setup is needed, and who is signed in |
| `POST /api/setup` | Create the owner account (first run only), optionally with `demo: true` to load sample data from `server/demo.js` |
| `POST /api/login` / `POST /api/logout` | Sign in and out |
| `POST /api/password` | Change the owner password |
| `GET /api/data` | Load all data |
| `GET /api/changes?since=N` | Changes since sequence N |
| `PUT /api/docs/:collection/:id` | Save one document |
| `DELETE /api/docs/:collection/:id` | Delete one document |
| `POST /api/import` | Restore a backup file |
| `POST /api/demo/clear` | Remove all gym records (used to clear sample data); settings are kept |

## Front-end files

The files in `public/js/` are plain scripts loaded in order, sharing one global scope.

| File | Holds |
| --- | --- |
| `state.js` | App state, exercise list, helpers |
| `sync.js` | Server calls, outbox, polling |
| `render.js` | Sign-in screens, header, footer, table labels |
| `blocks.js` | Calendar, PRs, history, body weight |
| `member.js` | Member screens |
| `owner.js` | Owner screens and reports |
| `reminders.js` | WhatsApp and SMS reminders |
| `settings.js` | Settings, backups, account |
| `actions.js` | What each button does |
| `events.js` | Input handling and timers |
| `main.js` | Start-up, sign-in and sign-out |

## Security

| Measure | Detail |
| --- | --- |
| Passwords | Hashed with scrypt and a random salt |
| Sessions | Random token in an HttpOnly, SameSite=Lax cookie; only a SHA-256 hash is stored |
| Brute force | 10 failed sign-ins per IP address per 15 minutes |
| Cross-site requests | Writes must be JSON and from the same origin |
| Headers | Content-Security-Policy, X-Frame-Options, nosniff, Referrer-Policy |
| Input | Collection allow-list, id pattern check, size limits |
