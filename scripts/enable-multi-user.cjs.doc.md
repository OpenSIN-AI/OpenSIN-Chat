# Multi-user mode maintenance utility

`scripts/enable-multi-user.cjs` is an explicit maintenance tool for enabling
multi-user mode directly in an existing OpenSIN Chat SQLite database.

## Security model

The utility:

- has no default password;
- requires exactly one explicit password source;
- uses parameterized database statements;
- does not print passwords or password hashes;
- validates usernames and roles;
- hashes plaintext passwords with bcrypt cost factor 12;
- runs the user and system-setting updates in one transaction.

## Prerequisites

Install the server dependencies:

```bash
cd server
yarn install --frozen-lockfile
cd ..
```

Back up the database before modifying it:

```bash
cp server/storage/opensin.db \
  "server/storage/opensin.db.backup.$(date +%Y%m%d-%H%M%S)"
```

## Plaintext password supplied locally

Use a strong, unique administrative password:

```bash
OPEN_SIN_CHAT_USERNAME="admin" \
OPEN_SIN_CHAT_PASSWORD="replace-with-a-unique-password" \
node scripts/enable-multi-user.cjs
```

The plaintext value is hashed locally and is not printed.

Avoid storing the command in shell history. An interactive shell can temporarily
disable history:

```bash
set +o history
OPEN_SIN_CHAT_USERNAME="admin" \
OPEN_SIN_CHAT_PASSWORD="replace-with-a-unique-password" \
node scripts/enable-multi-user.cjs
set -o history
```

## Precomputed bcrypt hash

A precomputed bcrypt hash avoids transferring plaintext credentials to the
deployment host:

```bash
OPEN_SIN_CHAT_USERNAME="admin" \
OPEN_SIN_CHAT_HASHED_PASSWORD='$2b$12$replace-with-complete-hash' \
node scripts/enable-multi-user.cjs
```

## Alternative database location

```bash
OPENSIN_CHAT_DB_PATH="/absolute/path/to/opensin.db" \
OPEN_SIN_CHAT_USERNAME="admin" \
OPEN_SIN_CHAT_PASSWORD="replace-with-a-unique-password" \
node scripts/enable-multi-user.cjs
```

## Supported roles

* `admin`
* `manager`
* `default`

The default maintenance role is `admin`.

## Verification

The utility verifies:

* `system_settings.multi_user_mode` is `true`;
* the target user exists;
* the requested username and role were persisted.

Credential values and hashes are never included in the verification output.

Restart the application after a successful migration.
