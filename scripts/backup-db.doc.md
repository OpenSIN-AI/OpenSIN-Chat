# backup-db.sh

## Purpose

Online-safe backups of the production SQLite database
(`server/storage/openafd.db`) — the single file that contains all users,
workspaces, API keys, chats, and settings. Losing it without a backup is an
unrecoverable total loss.

## Why not `cp`?

Copying a live SQLite file while the server writes to it produces corrupt
snapshots. This script uses `sqlite3 .backup`, which takes a transactionally
consistent snapshot, then verifies it with `PRAGMA integrity_check` before
compressing.

## Usage

| Command | Effect |
| --- | --- |
| `./scripts/backup-db.sh` | Snapshot → verify → gzip → prune old backups |
| `BACKUP_DIR=/mnt/nas ./scripts/backup-db.sh` | Backup to external storage |

## Configuration

| Env | Default | Meaning |
| --- | --- | --- |
| `DB_PATH` | `server/storage/openafd.db` | Source database |
| `BACKUP_DIR` | `server/storage/backups` | Backup destination |
| `BACKUP_RETENTION_DAYS` | `14` | Delete `.db.gz` files older than N days |

## Recommended setup (production)

1. Cron daily at 03:30 — see header comment in the script.
2. `BACKUP_DIR` MUST point to a **different physical disk** (NAS, external
   drive, or cloud-synced folder). A backup on the same disk as the database
   does not survive disk failure.
3. Test a restore quarterly:
   `gunzip -k backup.db.gz && sqlite3 restored.db "PRAGMA integrity_check;"`

## Restore procedure

1. Stop the server / container.
2. `gunzip -c server/storage/backups/openafd-<stamp>.db.gz > server/storage/openafd.db`
3. Restart. Verify login + one workspace chat.
