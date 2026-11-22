# Installing GymVerse

GymVerse runs anywhere Docker or Node.js runs: a cloud server (VPS), a computer at the gym, or a home server. All data is stored in one folder on that machine.

| Method | Best for | You need |
| --- | --- | --- |
| [One-command installer](#quickest-one-command-installer) | Getting started fast | Docker, or Node.js 22.13+ |
| [Docker](#option-a-docker) | Most people with a server | Docker with Compose |
| [Node.js](#option-b-nodejs) | Servers without Docker, or local use | Node.js 22.13 or newer (24 LTS recommended) |

## Quickest: one-command installer

macOS and Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/namanguptaa/gymverse/main/scripts/install.sh | bash
```

Windows PowerShell (needs Docker Desktop):

```powershell
irm https://raw.githubusercontent.com/namanguptaa/gymverse/main/scripts/install.ps1 | iex
```

| What the installer does | Detail |
| --- | --- |
| Picks the method | Docker if it's installed and running, otherwise Node.js 22.13+ |
| Installs into | `~/gymverse` (change with `--dir` on macOS/Linux, or `$env:GYMVERSE_DIR` on Windows) |
| Uses port | 3000 (change with `--port`, or `GYMVERSE_PORT`) |
| Keeps your setup | Never overwrites an existing `docker-compose.yml` |
| Falls back | Builds from source if the prebuilt image can't be downloaded |

Want to read the script first? It's in [`scripts/`](../scripts). To pass options when piping: `curl -fsSL … | bash -s -- --port 8080`.

## Option A: Docker

**Prebuilt image, no clone needed:**

```bash
docker run -d --name gymverse -p 3000:3000 -v gymverse-data:/data --restart unless-stopped ghcr.io/namanguptaa/gymverse:latest
```

**With Compose** (uses the same image):

```bash
git clone https://github.com/namanguptaa/gymverse.git
cd gymverse
docker compose up -d
```

**Build from source instead:** `docker compose -f docker-compose.dev.yml up -d --build`

Open `http://<your-server-ip>:3000` and create the owner account. Tick **Fill with sample data** to explore a demo gym first.

Images are published to `ghcr.io/namanguptaa/gymverse` for `linux/amd64` and `linux/arm64` (so they run on Raspberry Pi and ARM servers). Tags: `latest`, version numbers like `1.0.0`, and commit hashes.

| Task | Command |
| --- | --- |
| See logs | `docker compose logs -f` |
| Stop | `docker compose down` |
| Update to the latest version | `docker compose pull && docker compose up -d` |
| Back up right now | `docker compose exec gymverse node --disable-warning=ExperimentalWarning server/cli.js backup` |
| Reset the owner password | `docker compose exec -it gymverse node --disable-warning=ExperimentalWarning server/cli.js reset-password` |
| Copy backups to this computer | `docker compose cp gymverse:/data/backups ./gymverse-backups` |

Data lives in the Docker volume `gymverse-data`, so it survives updates and restarts.

## Option B: Node.js

```bash
git clone https://github.com/namanguptaa/gymverse.git
cd gymverse
npm start
```

There's no `npm install` step: GymVerse uses only what comes with Node.js. Open `http://localhost:3000` and create the owner account (tick **Fill with sample data** to explore first).

To keep it running after you close the terminal, use a process manager. With systemd on Linux, create `/etc/systemd/system/gymverse.service`:

```ini
[Unit]
Description=GymVerse
After=network.target

[Service]
WorkingDirectory=/opt/gymverse
ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning server/index.js
Restart=always
User=gymverse
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Then run `sudo systemctl enable --now gymverse`. Alternatively, run `pm2 start npm --name gymverse -- start`.

| Task | Command |
| --- | --- |
| Update | `git pull`, then restart the service |
| Back up right now | `npm run backup` |
| Reset the owner password | `npm run reset-password` |

## Settings

Set these as environment variables, in `docker-compose.yml`, or in a `.env` file (copy `.env.example`).

| Variable | Default | What it does |
| --- | --- | --- |
| `PORT` | `3000` | Port the server listens on |
| `HOST` | `0.0.0.0` | Network address to listen on |
| `DATA_DIR` | `data` | Folder for the database and backups |
| `BACKUP_KEEP` | `30` | How many daily backups to keep |
| `SESSION_DAYS` | `90` | How long a sign-in lasts on a device |
| `COOKIE_SECURE` | `false` | Set to `true` when served over HTTPS |
| `TRUST_PROXY` | `false` | Set to `true` behind Caddy, Nginx or Traefik |

## Use your own domain with HTTPS (recommended)

Put GymVerse behind a reverse proxy that handles HTTPS. [Caddy](https://caddyserver.com) gets certificates automatically. Point your domain's DNS (an A record for `gym.example.com`) at the server, then use this `Caddyfile`:

```
gym.example.com {
    reverse_proxy localhost:3000
}
```

Then set `COOKIE_SECURE=true` and `TRUST_PROXY=true` and restart GymVerse.

With Nginx, pass these headers: `Host`, `X-Forwarded-For` and `X-Forwarded-Proto`.

## Backups

| Backup | Where | How often |
| --- | --- | --- |
| Automatic database copy | `data/backups/gymverse-YYYY-MM-DD.db` | Daily, keeping the last `BACKUP_KEEP` |
| Backup file from the app | Downloaded by the owner (Owner > Settings > Backup and export) | Whenever you like; the app reminds you weekly |
| Excel export | Downloaded by the owner | Whenever you like |

Copy the `data/backups` folder to another place (Google Drive, another server) regularly. A backup on the same machine won't help if that machine fails.

**To restore**, use either of these:

- **From a backup file:** in the app, go to Owner > Settings > Restore from a backup file.
- **From a database copy:** stop GymVerse, replace `data/gymverse.db` with a file from `data/backups` (renamed to `gymverse.db`), delete any `gymverse.db-wal` and `gymverse.db-shm` files, and start GymVerse again.

## Sample data

If you ticked **Fill with sample data** during setup, a blue bar shows across the top of the app. When you're ready to start for real, go to the **Owner** area and tap **Clear sample data** twice. This removes all members, plans, routines, attendance, workouts and body weight entries, but keeps your gym settings and login.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `node:sqlite` not found | Update Node.js to 22.13 or newer |
| Can't open the app from another device | Open port 3000 in the server firewall, or use a reverse proxy |
| Signed out after every reload on HTTPS | Set `COOKIE_SECURE=true`, and `TRUST_PROXY=true` behind a proxy |
| Forgot the owner password | Run the reset-password command for your install method |
| "Cross-site request blocked" behind a proxy | Make sure the proxy forwards the `Host` header, or set `TRUST_PROXY=true` |
