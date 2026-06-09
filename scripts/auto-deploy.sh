#!/usr/bin/env bash
#
# auto-deploy.sh — Lokaler Polling-Deploy für OpenAfD-Chat
# -----------------------------------------------------------------------------
# Holt regelmäßig den neuesten Stand von origin/main. Wenn sich etwas geändert
# hat, wird das Docker-Image NEU gebaut (--no-cache erzwingt ein frisches
# Frontend-Bundle) und der Container neu gestartet.
#
# Gedacht für einen lokalen Mac, der den Container hostet und von außen nicht
# direkt erreichbar ist. Wird per cron / launchd alle paar Minuten ausgeführt.
#
# Einrichtung siehe: docs/AUTO-DEPLOY.md
# -----------------------------------------------------------------------------

set -euo pipefail

# --- Konfiguration (bei Bedarf anpassen) ------------------------------------
# Wurzel des Repos. Standard: zwei Ebenen über diesem Skript (scripts/..).
REPO_DIR="${OPENAFD_REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BRANCH="${OPENAFD_BRANCH:-main}"
COMPOSE_FILE="${OPENAFD_COMPOSE_FILE:-docker/docker-compose.yml}"
HEALTH_URL="${OPENAFD_HEALTH_URL:-http://localhost:3001/api/ping}"
LOCK_FILE="${OPENAFD_LOCK_FILE:-/tmp/openafd-auto-deploy.lock}"
LOG_FILE="${OPENAFD_LOG_FILE:-$REPO_DIR/logs/auto-deploy.log}"

# docker compose vs. docker-compose automatisch erkennen
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "FEHLER: weder 'docker compose' noch 'docker-compose' gefunden" >&2
  exit 1
fi

# --- Logging ----------------------------------------------------------------
mkdir -p "$(dirname "$LOG_FILE")"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# --- Nur eine Instanz gleichzeitig ------------------------------------------
# Verhindert, dass sich zwei cron-Läufe überlappen, während gebaut wird.
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Ein anderer Deploy-Lauf ist aktiv — überspringe."
  exit 0
fi

cd "$REPO_DIR"

# --- Änderungen prüfen ------------------------------------------------------
log "Prüfe origin/$BRANCH auf neue Commits…"
git fetch origin "$BRANCH" --quiet

LOCAL="$(git rev-parse "$BRANCH" 2>/dev/null || echo none)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL" = "$REMOTE" ]; then
  log "Keine Änderungen ($LOCAL). Nichts zu tun."
  exit 0
fi

log "Neue Version gefunden: $LOCAL -> $REMOTE. Starte Deploy."

# --- Code aktualisieren -----------------------------------------------------
git checkout "$BRANCH" --quiet
git reset --hard "origin/$BRANCH" --quiet
log "Code auf origin/$BRANCH gesetzt."

# --- Image neu bauen & Container neu starten --------------------------------
# --no-cache ist entscheidend: ohne ihn kann Docker den Frontend-Build-Layer
# aus dem Cache wiederverwenden und das alte Bundle bliebe online.
log "Baue Image neu (--no-cache)…"
$COMPOSE -f "$COMPOSE_FILE" build --no-cache

log "Starte Container neu…"
$COMPOSE -f "$COMPOSE_FILE" up -d

# --- Healthcheck ------------------------------------------------------------
log "Warte auf Healthcheck ($HEALTH_URL)…"
ok=0
for i in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 3
done

if [ "$ok" = "1" ]; then
  log "Deploy erfolgreich. Live auf neuer Version $REMOTE."
else
  log "WARNUNG: Healthcheck nicht bestanden. Container-Logs prüfen:"
  log "  $COMPOSE -f $COMPOSE_FILE logs --tail=100"
  exit 1
fi
