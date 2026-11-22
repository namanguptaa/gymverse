# GymVerse one-command installer for Windows (needs Docker Desktop).
#
#   irm https://raw.githubusercontent.com/namanguptaa/gymverse/main/scripts/install.ps1 | iex
#
# Set $env:GYMVERSE_DIR or $env:GYMVERSE_PORT first to change the folder or port.
# SPDX-License-Identifier: AGPL-3.0-or-later
$ErrorActionPreference = 'Stop'

$Repo  = 'namanguptaa/gymverse'
$Image = "ghcr.io/${Repo}:latest"
$Dir   = if ($env:GYMVERSE_DIR)  { $env:GYMVERSE_DIR }  else { Join-Path $HOME 'gymverse' }
$Port  = if ($env:GYMVERSE_PORT) { $env:GYMVERSE_PORT } else { '3000' }

function Fail($msg) { Write-Host "Error: $msg" -ForegroundColor Red; exit 1 }

Write-Host "Installing GymVerse into $Dir" -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Fail 'Docker Desktop is needed. Install it from https://docs.docker.com/desktop/install/windows-install/ and run this again.'
}
docker info *> $null
if ($LASTEXITCODE -ne 0) { Fail 'Docker is installed but not running. Start Docker Desktop and run this again.' }

New-Item -ItemType Directory -Force -Path $Dir | Out-Null
Set-Location $Dir

if (Test-Path 'docker-compose.yml') {
  Write-Host '  Found an existing docker-compose.yml, keeping it.'
} else {
@"
services:
  gymverse:
    image: $Image
    container_name: gymverse
    restart: unless-stopped
    ports:
      - "$($Port):3000"
    environment:
      - COOKIE_SECURE=false
      - TRUST_PROXY=false
      - BACKUP_KEEP=30
    volumes:
      - gymverse-data:/data
volumes:
  gymverse-data:
"@ | Set-Content -Encoding utf8 'docker-compose.yml'
}

docker compose pull *> $null
if ($LASTEXITCODE -eq 0) {
  docker compose up -d
} else {
  Write-Host "  Couldn't download the ready-made image, building from source instead."
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail 'Git is needed to build from source. Install it from https://git-scm.com and run this again.' }
  if (-not (Test-Path 'src\.git')) { git clone --depth 1 "https://github.com/$Repo.git" src }
  (Get-Content 'docker-compose.yml') -replace [regex]::Escape("image: $Image"), 'build: ./src' | Set-Content -Encoding utf8 'docker-compose.yml'
  docker compose up -d --build
}
if ($LASTEXITCODE -ne 0) { Fail "Docker couldn't start GymVerse. See: cd $Dir; docker compose logs" }

Write-Host '  Waiting for GymVerse to start...'
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  try { Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/api/health" -TimeoutSec 2 | Out-Null; $ok = $true; break } catch { Start-Sleep 1 }
}
if (-not $ok) { Fail "GymVerse didn't start. See: cd $Dir; docker compose logs" }

Write-Host "GymVerse is running: http://localhost:$Port" -ForegroundColor Green
Write-Host '  Open it in your browser and create the owner account.'
Write-Host "  Stop:    cd $Dir; docker compose down"
Write-Host "  Update:  cd $Dir; docker compose pull; docker compose up -d"
Start-Process "http://localhost:$Port"
