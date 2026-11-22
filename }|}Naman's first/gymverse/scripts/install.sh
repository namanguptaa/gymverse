#!/usr/bin/env bash
# GymVerse one-command installer for macOS and Linux.
#
#   curl -fsSL https://raw.githubusercontent.com/namanguptaa/gymverse/main/scripts/install.sh | bash
#
# Options (put after "bash -s --"):  --dir <folder>   --port <number>
# Or set GYMVERSE_DIR / GYMVERSE_PORT. It never overwrites an existing setup.
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

REPO="namanguptaa/gymverse"
IMAGE="ghcr.io/${REPO}:latest"
DIR="${GYMVERSE_DIR:-$HOME/gymverse}"
PORT="${GYMVERSE_PORT:-3000}"

while [ $# -gt 0 ]; do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    -h|--help) sed -n '2,8p' "$0" 2>/dev/null || true; exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
fail() { printf '\033[31mError:\033[0m %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

wait_for_app() {
  info "Waiting for GymVerse to start..."
  for _ in $(seq 1 60); do
    if have curl && curl -fsS "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

bold "Installing GymVerse into ${DIR}"

# ---------- Docker (recommended) ----------
if have docker && docker compose version >/dev/null 2>&1; then
  docker info >/dev/null 2>&1 || fail "Docker is installed but not running. Start Docker and run this again."
  mkdir -p "$DIR"; cd "$DIR"
  if [ -f docker-compose.yml ]; then
    info "Found an existing docker-compose.yml, keeping it."
  else
    cat > docker-compose.yml <<YAML
services:
  gymverse:
    image: ${IMAGE}
    container_name: gymverse
    restart: unless-stopped
    ports:
      - "${PORT}:3000"
    environment:
      - COOKIE_SECURE=false
      - TRUST_PROXY=false
      - BACKUP_KEEP=30
    volumes:
      - gymverse-data:/data
volumes:
  gymverse-data:
YAML
  fi

  if docker compose pull >/dev/null 2>&1; then
    docker compose up -d
  else
    info "Couldn't download the ready-made image, building from source instead (takes a minute)."
    have git || fail "Git is needed to build from source. Install git and run this again."
    [ -d src/.git ] || git clone --depth 1 "https://github.com/${REPO}.git" src
    sed -i.bak "s#image: ${IMAGE}#build: ./src#" docker-compose.yml && rm -f docker-compose.yml.bak
    docker compose up -d --build
  fi

  wait_for_app || fail "GymVerse didn't start. See the logs with: cd ${DIR} && docker compose logs"
  bold "GymVerse is running: http://localhost:${PORT}"
  info "Open it in your browser and create the owner account."
  info "Stop:    cd ${DIR} && docker compose down"
  info "Update:  cd ${DIR} && docker compose pull && docker compose up -d"
  exit 0
fi

# ---------- Node.js ----------
if have node; then
  ver="$(node -p 'process.versions.node')"
  major="${ver%%.*}"; minor="$(echo "$ver" | cut -d. -f2)"
  if [ "$major" -gt 22 ] || { [ "$major" -eq 22 ] && [ "$minor" -ge 13 ]; }; then
    if [ -d "$DIR/.git" ]; then
      info "Found an existing GymVerse folder, updating it."
      git -C "$DIR" pull --ff-only || true
    elif have git; then
      git clone --depth 1 "https://github.com/${REPO}.git" "$DIR"
    else
      have curl || fail "Install git or curl and run this again."
      mkdir -p "$DIR"
      curl -fsSL "https://codeload.github.com/${REPO}/tar.gz/refs/heads/main" | tar -xz --strip-components=1 -C "$DIR"
    fi
    bold "GymVerse is installed in ${DIR}"
    info "Start it with:   cd ${DIR} && PORT=${PORT} npm start"
    info "Then open:       http://localhost:${PORT}"
    info "To keep it running in the background, see docs/INSTALL.md (systemd or pm2)."
    exit 0
  fi
  info "Node.js ${ver} is too old (GymVerse needs 22.13 or newer)."
fi

fail "GymVerse needs Docker (https://docs.docker.com/get-docker/) or Node.js 22.13+ (https://nodejs.org). Install one and run this again."
