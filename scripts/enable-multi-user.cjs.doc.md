# enable-multi-user.cjs

## Purpose

Switch an OpenSIN-Chat instance from single-user mode to multi-user mode by
writing directly to the SQLite database. This is useful when the UI is
unreachable or when the single-user password is known but the multi-user setup
endpoint cannot be used.

The script does two things atomically inside a transaction:

1. Sets `system_settings.multi_user_mode` to `true`.
2. Ensures a target user exists with role `admin` and a bcrypt-hashed password.

## Why not call the API?

The `/system/enable-multi-user` endpoint exists, but it is only usable when the
instance is still in single-user mode, requires a valid API key / auth token,
and performs data migrations. In some recovery scenarios it is simpler to make
the DB change directly and restart the container.

## Usage

Run on the host that owns the database file (production server, VM, etc.):

```bash
# Option A: let the script hash a plaintext password with bcrypt (cost 10)
cd /home/ubuntu/OpenSIN-Chat
sudo -E OPEN_SIN_CHAT_PASSWORD="YourPassword" node scripts/enable-multi-user.cjs

# Option B: pass a pre-computed bcrypt hash so plaintext never touches the server
sudo -E OPEN_SIN_CHAT_HASHED_PASSWORD='$2a$10$...' node scripts/enable-multi-user.cjs
```

**Do not commit plaintext passwords.** The script is designed to accept the
secret through environment variables or command-line arguments, not hardcoded
values in the file.

## Configuration

| Env | Default | Meaning |
| --- | --- | --- |
| `OPEN_SIN_CHAT_DB_PATH` | `server/storage/openafd.db` | Path to the SQLite database |
| `OPEN_SIN_CHAT_USERNAME` | `Simone123` | Username to create or rename the admin to |
| `OPEN_SIN_CHAT_PASSWORD` | — | Plaintext password to hash and store |
| `OPEN_SIN_CHAT_HASHED_PASSWORD` | — | Pre-computed bcrypt hash to store |
| `OPEN_SIN_CHAT_ROLE` | `admin` | Role for the target user |
| `OPEN_SIN_CHAT_SQLITE3` | `sqlite3` | Path to the sqlite3 binary |

## What the script changes

- Upserts the `multi_user_mode` setting in `system_settings`.
- Renames the existing single-user admin (`id = 1`) to the target username.
- Hashes the password with `bcryptjs` (cost factor 10), matching the application.
- Resets `suspended`, `failed_login_count`, and `failed_login_last_at` on the
target user so a fresh login is possible.

## After running

Restart the backend container so it reads the new setting:

```bash
cd /home/ubuntu/OpenSIN-Chat/docker
docker compose -p opensin up -d --force-recreate opensin-chat
```

Then verify:

```bash
curl https://sinchat.delqhi.com/api/setup-complete
curl -X POST https://sinchat.delqhi.com/api/request-token \
  -H "Content-Type: application/json" \
  -d '{"username":"Simone123","password":"YourPassword"}'
```

## Reverting

If you need to go back to single-user mode, set the setting back to `false` and
restart:

```bash
sqlite3 server/storage/openafd.db \
  "INSERT INTO system_settings (label, value) VALUES ('multi_user_mode', 'false') ON CONFLICT (label) DO UPDATE SET value = 'false';"
```
