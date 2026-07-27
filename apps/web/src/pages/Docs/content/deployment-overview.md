# Deployment overview

The canonical deployment files live under `platform/containers/`.

## Prepare

Requirements:

- Docker with Compose
- persistent local or mounted storage
- strong unique secrets
- localhost or protected reverse-proxy exposure

Create the environment file:

```bash
cp platform/containers/compose/.env.example \
  platform/containers/compose/.env
```

Set at minimum strong values for authentication, JWT signing and encryption. Do not reuse development credentials.

## Build and start

For a local production-equivalent build, tag the image with the exact commit:

```bash
commit_sha=$(git rev-parse HEAD)
export OPENSIN_IMAGE_REPOSITORY=opensin-chat
export OPENSIN_IMAGE_TAG="$commit_sha"

docker compose \
  -f platform/containers/compose/docker-compose.yml \
  -f platform/containers/compose/docker-compose.production.yml \
  build opensin-chat

docker compose \
  -f platform/containers/compose/docker-compose.yml \
  -f platform/containers/compose/docker-compose.production.yml \
  up -d --no-deps opensin-chat
```

For a remote production host, use `tooling/scripts/deploy-production.sh`; it
resolves `origin/<branch>`, builds the full-SHA image, verifies internal and
optional public health, and retains a rollback image. The Compose build context
is the repository root and the image definition is
`platform/containers/image/Dockerfile`.

## Required storage

The deployment uses bind-mounted runtime directories:

```text
apps/api/storage-opensin  -> /app/server/storage
apps/worker/hotdir        -> /app/collector/hotdir
apps/worker/outputs       -> /app/collector/outputs
```

The permissions helper creates required directories and aligns ownership. The application refuses to start without persistent storage or writable worker directories.

## Health and readiness

A deployment is healthy only when:

- the API answers `/api/ping`,
- the document worker answers `/health`,
- required storage is writable,
- the API process remains alive,
- the worker process remains alive.

Either required process exiting terminates the container.

## Exposure

The default Compose binding is localhost. Expose the application through an authenticated and TLS-enabled reverse proxy or tunnel. Do not bind the application directly to an untrusted public interface unless equivalent controls are in place.

## Updating

Before updating production:

```bash
yarn verify:strict
```

Build a new immutable image, verify migrations against a copy of production data, create a restorable backup, then recreate the service. Do not rely on `docker restart` for environment changes.

## Rollback

A rollback requires both:

- the previous image,
- a database state compatible with that image.

Database migrations can make image-only rollback unsafe. Document rollback behavior for every destructive or incompatible migration.

See [`docker.md`](docker.md) for image details and [`../operations.md`](../operations.md) for runtime procedures.
