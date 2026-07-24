# Production container

## Source

- Image definition: `platform/containers/image/Dockerfile`
- Entrypoint: `platform/containers/image/docker-entrypoint.sh`
- Healthcheck: `platform/containers/image/docker-healthcheck.sh`
- Compose topology: `platform/containers/compose/docker-compose.yml`

## Build model

The image installs dependencies from the root workspace and the single root `yarn.lock`. Application-specific lockfiles are not supported.

The frontend is built in a Node.js 24 stage. API and document-worker production dependencies are installed from the root workspace, the Prisma client is generated during image build, and the built web application is copied into the API public directory.

## Runtime model

The container starts two required processes:

1. API at `/app/server`
2. document worker at `/app/collector`

This combined image is a deployment choice. Source ownership remains separated under `apps/api` and `apps/worker`.

The entrypoint monitors both processes. If either exits, the remaining process is terminated and the container exits.

## Storage

`STORAGE_DIR` is mandatory. The container refuses to start without it.

Required worker directories must be writable. Permission failures stop startup instead of allowing a partially functioning service.

## Healthcheck

The healthcheck validates:

- API `/api/ping`,
- worker `/health`,
- PDF-analysis storage access,
- relevant job and facts-store readability.

A healthy status therefore represents the complete core product path rather than API liveness alone.

## Hardening

Compose drops capabilities, enables `no-new-privileges`, binds localhost by default, uses an init process and limits resources.

Base image tags should be pinned by digest in a dedicated verified update. Chromium is omitted by default unless an explicitly controlled download URL and checksum are supplied.

## CI verification

The quality workflow builds the production image, starts it with isolated CI storage, waits for Docker health, probes API and worker endpoints and runs the browser smoke suite against the container.
