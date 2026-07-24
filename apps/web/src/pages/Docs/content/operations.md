# Operations

## Supported runtime

- Node.js 24
- one root Yarn lockfile
- Docker Compose for production-like deployments
- persistent API storage
- writable document-worker directories

## Local process model

Start all required applications from the repository root:

```bash
yarn dev
```

This starts web, API and document worker together. Starting only web and API produces an incomplete product for document and retrieval workflows.

## Health

The production runtime is healthy only when both required processes answer:

- API: `GET /api/ping`
- Worker: `GET /health` on the internal worker port

Container health also checks storage access. A worker crash terminates the API process and container; an API crash terminates the worker.

## Storage

Compose maps:

- `apps/api/storage-opensin` to `/app/server/storage`
- `apps/worker/hotdir` to `/app/collector/hotdir`
- `apps/worker/outputs` to `/app/collector/outputs`

Do not use the repository root for runtime data. Local legacy runtime material is isolated under ignored `.local/runtime/`.

## Backups

Create an online-safe SQLite snapshot:

```bash
./tooling/scripts/backup-db.sh
```

The backup script uses SQLite's `.backup` operation and validates database integrity before compression. Configure `DB_PATH`, `BACKUP_DIR` and `BACKUP_RETENTION_DAYS` when defaults do not match the deployment.

A backup is not considered reliable until restore and representative table reads have been verified. Use:

```bash
./tooling/scripts/verify-backup.sh <backup-directory> <database-path>
```

## Deployment updates

Use the canonical Compose files under `platform/containers/compose/`. Environment changes require container recreation rather than a simple process restart.

Before deployment:

```bash
yarn verify:strict
```

Then build the exact production image and wait for full health. Do not deploy when the worker is unavailable, storage is unwritable or database migrations have not been verified.

## Logs and incidents

Use request IDs to correlate API failures. Do not log request credentials, provider keys, OAuth tokens or generated one-time tokens.

For incident handling, follow [`INCIDENT-RESPONSE.md`](INCIDENT-RESPONSE.md). Preserve relevant logs and database snapshots before destructive remediation.

## Local and generated state

- `.local/` contains ignored machine-specific agent, runtime and generated state.
- `tooling/artifacts/` contains ignored engineering outputs such as SBOMs and code graphs.
- `docs/archive/` contains historical source material, not active operational instructions.

## Operational truth

A running process is not sufficient. Operational readiness requires:

- API health,
- worker health,
- database access,
- writable runtime directories,
- successful migration,
- verified backup path,
- browser smoke verification.
