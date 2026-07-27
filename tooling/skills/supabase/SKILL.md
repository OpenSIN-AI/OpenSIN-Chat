# Self-hosted Supabase operations

> Public operating guidance only. Production inventory is private.

## Security boundary

Do not store any production host address, SSH username, key path, absolute
filesystem path, internal IP, internal port, container name, tunnel identifier,
or credential in this repository.

Keep deployment-specific non-secret settings in an ignored operator file such
as `.local/operations/supabase.env`. Keep credentials in a password manager or
secret manager and inject them only for the duration of an operation.

## Required private configuration

A private operator configuration may define names such as:

```env
SUPABASE_DEPLOY_HOST=
SUPABASE_COMPOSE_DIR=
SUPABASE_COMPOSE_PROJECT=
SUPABASE_HEALTH_URL=
SUPABASE_PUBLIC_URL=
```

Do not commit the values. Container and service names should also be supplied
privately when they identify the production topology.

## Safe read-only checks

1. Verify the SSH target identity.
2. Verify the remote Compose project status without printing environment data.
3. Verify database readiness with a non-sensitive `SELECT 1` query.
4. Verify the private health endpoint from the host.
5. Verify the public endpoint without credentials where possible.
6. Record only timestamps, exit codes, versions, commit SHAs, and HTTP status.

## Secrets

Treat these values as secrets and never print them:

- database passwords and connection strings;
- JWT secrets;
- anonymous and service-role keys;
- dashboard credentials;
- SMTP credentials;
- tunnel credentials;
- encryption and signing keys.

Use key-name-only inspection when auditing environment files. Redirect any
value-bearing output to a protected local file only when strictly necessary.

## Changes and recovery

Before changing a production stack:

1. create and verify a backup;
2. capture the current image tags or digests privately;
3. make one bounded change;
4. wait for health checks;
5. verify database, API, authentication, and storage paths;
6. roll back immediately if verification fails.

Destructive database recovery commands require explicit operator approval and a
verified backup. Never place production recovery transcripts in public docs.
