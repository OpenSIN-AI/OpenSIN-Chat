#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# backup-db.sh — online-safe backup of the OpenSIN-Chat SQLite database.
#
# Uses `sqlite3 .backup` (consistent snapshot, safe while the server runs —
# never `cp` a live SQLite file!) plus gzip compression and retention.
#
# Usage:
#   ./scripts/backup-db.sh                  # backup with defaults
#   BACKUP_DIR=/mnt/nas/opensin ./scripts/backup-db.sh
#
# Cron (daily at 03:30):
#   30 3 * * * cd /path/to/OpenSIN-Chat && ./scripts/backup-db.sh >> storage/backups/backup.log 2>&1
#
# Env:
#   DB_PATH              (default: server/storage/opensin.db)
#   BACKUP_DIR           (default: server/storage/backups)
#   BACKUP_RETENTION_DAYS (default: 14)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

DB_PATH="${DB_PATH:-$REPO_ROOT/server/storage/opensin.db}"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/server/storage/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "[backup-db] ERROR: sqlite3 CLI not found. Install it (macOS: preinstalled; Debian: apt-get install sqlite3)." >&2
  exit 1
fi

if [ ! -f "$DB_PATH" ]; then
  echo "[backup-db] ERROR: database not found at $DB_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_DIR/opensin-$STAMP.db"

echo "[backup-db] Creating consistent snapshot of $DB_PATH ..."
sqlite3 "$DB_PATH" ".backup '$TARGET'"

echo "[backup-db] Verifying snapshot integrity ..."
CHECK="$(sqlite3 "$TARGET" "PRAGMA integrity_check;")"
if [ "$CHECK" != "ok" ]; then
  echo "[backup-db] ERROR: integrity check failed: $CHECK" >&2
  rm -f "$TARGET"
  exit 1
fi

gzip -f "$TARGET"
SIZE="$(du -h "$TARGET.gz" | cut -f1)"
echo "[backup-db] OK: $TARGET.gz ($SIZE)"

echo "[backup-db] Pruning backups older than $RETENTION_DAYS days ..."
find "$BACKUP_DIR" -name "opensin-*.db.gz" -type f -mtime "+$RETENTION_DAYS" -delete

COUNT="$(find "$BACKUP_DIR" -name 'opensin-*.db.gz' -type f | wc -l | tr -d ' ')"
echo "[backup-db] Done. $COUNT backup(s) retained in $BACKUP_DIR"
