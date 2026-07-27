#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Purpose: Apply bounded daily/weekly/monthly retention to a configured backup directory.

set -Eeuo pipefail

BACKUP_DIR="${1:-${OPENSIN_BACKUP_DIR:-}}"
if [[ -z "${BACKUP_DIR}" ]]; then
  echo "backup-retention: provide a backup directory argument or OPENSIN_BACKUP_DIR" >&2
  exit 2
fi
if [[ ! -d "${BACKUP_DIR}" ]]; then
  echo "backup-retention: directory does not exist" >&2
  exit 2
fi

LOG_FILE="${OPENSIN_BACKUP_RETENTION_LOG:-${BACKUP_DIR}/retention.log}"
NOW=$(date +%s)
SEVEN_DAYS=$((NOW - 7 * 86400))
FOUR_WEEKS=$((NOW - 28 * 86400))
SIX_MONTHS=$((NOW - 180 * 86400))
DELETED=0
KEPT=0

printf '[%s] retention start\n' "$(date -u +%FT%TZ)" >>"${LOG_FILE}"

for backup in "${BACKUP_DIR}"/*.db "${BACKUP_DIR}"/*.sqlite3 "${BACKUP_DIR}"/*.tar.gz; do
  [[ -f "${backup}" ]] || continue

  file_name=$(basename "${backup}")
  file_mtime=$(stat -c %Y "${backup}" 2>/dev/null || stat -f %m "${backup}")
  file_date=$(date -r "${file_mtime}" +%Y-%m-%d 2>/dev/null || date -d "@${file_mtime}" +%Y-%m-%d)

  keep=false
  reason=""
  if ((file_mtime > SEVEN_DAYS)); then
    keep=true
    reason=recent
  elif ((file_mtime > FOUR_WEEKS)); then
    day_of_week=$(date -r "${file_mtime}" +%u 2>/dev/null || date -d "@${file_mtime}" +%u)
    [[ "${day_of_week}" == 1 ]] && keep=true && reason=weekly
  elif ((file_mtime > SIX_MONTHS)); then
    day_of_month=$(date -r "${file_mtime}" +%d 2>/dev/null || date -d "@${file_mtime}" +%d)
    [[ "${day_of_month}" == 01 ]] && keep=true && reason=monthly
  fi

  if [[ "${keep}" == true ]]; then
    KEPT=$((KEPT + 1))
    printf '[%s] keep %s (%s, %s)\n' "$(date -u +%FT%TZ)" "${file_name}" "${file_date}" "${reason}" >>"${LOG_FILE}"
  else
    rm -f -- "${backup}"
    DELETED=$((DELETED + 1))
    printf '[%s] delete %s (%s)\n' "$(date -u +%FT%TZ)" "${file_name}" "${file_date}" >>"${LOG_FILE}"
  fi
done

printf '[%s] retention complete kept=%s deleted=%s\n' "$(date -u +%FT%TZ)" "${KEPT}" "${DELETED}" >>"${LOG_FILE}"
