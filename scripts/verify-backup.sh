#!/usr/bin/env bash
# SPDX-License-Identifier: MIT

set -euo pipefail

BACKUP_DIR="${1:-/home/ubuntu/backups}"
DB_PATH="${2:-/home/ubuntu/OpenSIN-Chat/server/storage/openafd.db}"
TEMP_DB="/tmp/opensin-backup-verify.db"
LOG_FILE="/home/ubuntu/backups/verify.log"

LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.db 2>/dev/null | head -1 || ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "[$(date)] ERROR: No backup found in $BACKUP_DIR" >> "$LOG_FILE"
  exit 1
fi

echo "[$(date)] Verifying backup: $LATEST_BACKUP" >> "$LOG_FILE"

rm -f "$TEMP_DB"

if [[ "$LATEST_BACKUP" == *.db ]]; then
  cp "$LATEST_BACKUP" "$TEMP_DB"
elif [[ "$LATEST_BACKUP" == *.tar.gz ]]; then
  tar -xzf "$LATEST_BACKUP" -C /tmp/ --wildcards "*.db" --strip-components=0
  EXTRACTED=$(find /tmp/ -name "*.db" -newer "$LATEST_BACKUP" | head -1)
  [ -z "$EXTRACTED" ] && { echo "[$(date)] ERROR: No .db in archive" >> "$LOG_FILE"; exit 1; }
  cp "$EXTRACTED" "$TEMP_DB"
  rm -f "$EXTRACTED"
fi

if ! sqlite3 "$TEMP_DB" "PRAGMA integrity_check;" > /dev/null 2>&1; then
  echo "[$(date)] ERROR: Integrity check failed for $LATEST_BACKUP" >> "$LOG_FILE"
  rm -f "$TEMP_DB"
  exit 1
fi

TABLES="users workspaces workspace_threads workspace_chats workspace_documents workspace_notes"
for table in $TABLES; do
  COUNT=$(sqlite3 "$TEMP_DB" "SELECT count(*) FROM $table;" 2>/dev/null || echo "-1")
  if [ "$COUNT" = "-1" ]; then
    echo "[$(date)] WARN: Table '$table' missing or empty" >> "$LOG_FILE"
  else
    echo "[$(date)] OK: $table has $COUNT rows" >> "$LOG_FILE"
  fi
done

if [ -f "$DB_PATH" ]; then
  for table in $TABLES; do
    PROD_COUNT=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM $table;" 2>/dev/null || echo "-1")
    BACKUP_COUNT=$(sqlite3 "$TEMP_DB" "SELECT count(*) FROM $table;" 2>/dev/null || echo "-1")
    if [ "$PROD_COUNT" != "$BACKUP_COUNT" ]; then
      echo "[$(date)] WARN: $table count mismatch (prod=$PROD_COUNT, backup=$BACKUP_COUNT)" >> "$LOG_FILE"
    fi
  done
fi

echo "[$(date)] Verification complete: $LATEST_BACKUP" >> "$LOG_FILE"
rm -f "$TEMP_DB"
exit 0
