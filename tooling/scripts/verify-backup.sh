#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Purpose: Verify the newest configured SQLite backup without exposing production data.

set -Eeuo pipefail

BACKUP_DIR="${1:-${OPENSIN_BACKUP_DIR:-}}"
DB_PATH="${2:-${OPENSIN_DATABASE_PATH:-}}"
if [[ -z "${BACKUP_DIR}" || ! -d "${BACKUP_DIR}" ]]; then
  echo "verify-backup: provide a valid backup directory" >&2
  exit 2
fi

LOG_FILE="${OPENSIN_BACKUP_VERIFY_LOG:-${BACKUP_DIR}/verify.log}"
TEMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/opensin-backup-verify.XXXXXX")
TEMP_DB="${TEMP_DIR}/backup.db"
cleanup() { rm -rf -- "${TEMP_DIR}"; }
trap cleanup EXIT

latest_backup=$(
  find "${BACKUP_DIR}" -maxdepth 1 -type f \( -name '*.db' -o -name '*.sqlite3' -o -name '*.tar.gz' \) \
    -print0 | xargs -0 stat -f '%m %N' 2>/dev/null | sort -nr | cut -d' ' -f2- | head -1
)
if [[ -z "${latest_backup}" ]]; then
  printf '[%s] error no backup found\n' "$(date -u +%FT%TZ)" >>"${LOG_FILE}"
  exit 1
fi

printf '[%s] verification start file=%s\n' "$(date -u +%FT%TZ)" "$(basename "${latest_backup}")" >>"${LOG_FILE}"

case "${latest_backup}" in
  *.db|*.sqlite3)
    cp -- "${latest_backup}" "${TEMP_DB}"
    ;;
  *.tar.gz)
    archive_member=$(tar -tzf "${latest_backup}" | awk '/\.(db|sqlite3)$/ {print; exit}')
    [[ -n "${archive_member}" ]] || {
      printf '[%s] error archive contains no SQLite database\n' "$(date -u +%FT%TZ)" >>"${LOG_FILE}"
      exit 1
    }
    case "${archive_member}" in
      /*|*../*)
        printf '[%s] error unsafe archive member\n' "$(date -u +%FT%TZ)" >>"${LOG_FILE}"
        exit 1
        ;;
    esac
    tar -xOzf "${latest_backup}" "${archive_member}" >"${TEMP_DB}"
    ;;
esac

integrity=$(sqlite3 "${TEMP_DB}" 'PRAGMA integrity_check;')
if [[ "${integrity}" != ok ]]; then
  printf '[%s] error integrity check failed\n' "$(date -u +%FT%TZ)" >>"${LOG_FILE}"
  exit 1
fi

backup_tables=$(sqlite3 "${TEMP_DB}" "SELECT count(*) FROM sqlite_master WHERE type='table';")
printf '[%s] sqlite integrity=ok tables=%s\n' "$(date -u +%FT%TZ)" "${backup_tables}" >>"${LOG_FILE}"

if [[ -n "${DB_PATH}" && -f "${DB_PATH}" ]]; then
  production_tables=$(sqlite3 "${DB_PATH}" "SELECT count(*) FROM sqlite_master WHERE type='table';")
  printf '[%s] production comparison tables=%s\n' "$(date -u +%FT%TZ)" "${production_tables}" >>"${LOG_FILE}"
fi

printf '[%s] verification complete\n' "$(date -u +%FT%TZ)" >>"${LOG_FILE}"
