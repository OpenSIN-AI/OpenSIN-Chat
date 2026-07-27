# Run OpenSIN Chat with containers

The supported Compose topology lives under `platform/containers/compose/`.
Do not run the application with elevated Linux capabilities, privileged mode,
host namespaces, or public database/application port bindings.

## Prepare configuration

```bash
cp platform/containers/compose/.env.example \
  platform/containers/compose/.env
```

Set required secrets in the ignored `.env` file. Never commit that file.

## Start the canonical stack

```bash
docker compose \
  --project-directory platform/containers/compose \
  -f platform/containers/compose/docker-compose.yml \
  -f platform/containers/compose/docker-compose.production.yml \
  up -d --build
```

The application port binds to host loopback by default. Put a reverse proxy or
private tunnel in front of it rather than changing the bind address to a public
interface.

## Security properties

The canonical stack:

- drops all Linux capabilities from the application container;
- enables `no-new-privileges`;
- runs the application as a non-root user;
- uses a bounded permission-initialization container with only the minimal
  filesystem capabilities it requires;
- binds the application and optional sidecars to `127.0.0.1`;
- uses an isolated bridge network;
- declares resource and log limits;
- verifies both API and document-worker health.

Do not weaken these controls to make a feature work. Fix the feature or isolate
it in a narrowly scoped sidecar.

## Immutable production deployment

Use `tooling/scripts/deploy-production.sh`. It resolves the target Git commit,
builds an image tagged with the full commit SHA, starts that exact image, checks
health, and retains a rollback image.

## Optional GPU OCR

Combine the canonical stack with
`platform/containers/compose/docker-compose.unlimited-ocr.yml`. The overlay
uses private shared memory rather than a host IPC namespace and publishes its
API on loopback only.
