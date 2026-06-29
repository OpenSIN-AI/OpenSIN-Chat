#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-/home/ubuntu/backups}"
LOG_FILE="${BACKUP_DIR}/retention.log"
NOW=$(date +%s)

echo "[$(date)] Starting backup retention cleanup in $BACKUP_DIR" >> "$LOG_FILE"

SEVEN_DAYS=$((NOW - 7 * 86400))
FOUR_WEEKS=$((NOW - 28 * 86400))
SIX_MONTHS=$((NOW - 180 * 86400))

DELETED=0
KEPT=0

for backup in "$BACKUP_DIR"/*.db "$BACKUP_DIR"/*.tar.gz; do
  [ -f "$backup" ] || continue

  FILE_NAME=$(basename "$backup")
  FILE_MTIME=$(stat -c %Y "$backup" 2>/dev/null || stat -f %m "$backup" 2>/dev/null)
  FILE_DATE=$(date -r "$FILE_MTIME" +%Y-%m-%d 2>/dev/null || date -d @$FILE_MTIME +%Y-%m-%d 2>/dev/null)

  if [ "$FILE_MTIME" -gt "$SEVEN_DAYS" ]; then
    KEPT=$((KEPT + 1))
    echo "[$(date)] KEEP (recent): $FILE_NAME ($FILE_DATE)" >> "$LOG_FILE"
  elif [ "$FILE_MTIME" -gt "$FOUR_WEEKS" ]; then
    DAY_OF_WEEK=$(date -r "$FILE_MTIME" +%u 2>/dev/null || date -d @$FILE_MTIME +%u 2>/dev/null)
    if [ "$DAY_OF_WEEK" = "1" ]; then
      KEPT=$((KEPT + 1))
      echo "[$(date)] KEEP (weekly): $FILE_NAME ($FILE_DATE)" >> "$LOG_FILE"
    else
      rm -f "$backup"
      DELETED=$((DELETED + 1))
      echo "[$(date)] DELETE (old weekly): $FILE_NAME ($FILE_DATE)" >> "$LOG_FILE"
    fi
  elif [ "$FILE_MTIME" -gt "$SIX_MONTHS" ]; then
    DAY_OF_MONTH=$(date -r "$FILE_MTIME" +%d 2>/dev/null || date -d @$FILE_MTIME +%d 2>/dev/null)
    if [ "$DAY_OF_MONTH" = "01" ]; then
      KEPT=$((KEPT + 1))
      echo "[$(date)] KEEP (monthly): $FILE_NAME ($FILE_DATE)" >> "$LOG_FILE"
    else
      rm -f "$backup"
      DELETED=$((DELETED + 1))
      echo "[$(date)] DELETE (old monthly): $FILE_NAME ($FILE_DATE)" >> "$LOG_FILE"
    fi
  else
    rm -f "$backup"
    DELETED=$((DELETED + 1))
    echo "[$(date)] DELETE (expired): $FILE_NAME ($FILE_DATE)" >> "$LOG_FILE"
  fi
done

echo "[$(date)] Retention complete: $KEPT kept, $DELETED deleted" >> "$LOG_FILE"
