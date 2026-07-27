# Local polling auto-deploy

`tooling/scripts/auto-deploy.sh` is an optional local polling deploy for a
trusted host. Production operators should prefer the explicit
`tooling/scripts/deploy-production.sh` workflow.

## Security and immutability

The polling deploy:

1. refuses tracked or untracked source changes;
2. fetches the configured remote branch;
3. resolves the full target commit SHA;
4. builds `IMAGE_REPOSITORY:<full-commit-sha>`;
5. starts that exact image through the canonical Compose files;
6. verifies the API health response;
7. verifies the running image reference;
8. restores a pre-tagged previous image if deployment fails.

It never copies files into a running container and never rebuilds an old commit
as a rollback mechanism.

## Configuration

Run from a trusted checkout:

```bash
OPENSIN_BRANCH=main \
OPENSIN_HEALTH_URL=http://127.0.0.1:43939/api/ping \
./tooling/scripts/auto-deploy.sh
```

Optional variables:

| Variable | Purpose |
| --- | --- |
| `OPENSIN_REPO_DIR` | Repository root; defaults to the script's checkout |
| `OPENSIN_BRANCH` | Remote branch to poll |
| `OPENSIN_COMPOSE_SERVICE` | Canonical Compose service |
| `OPENSIN_IMAGE_REPOSITORY` | Local image repository name |
| `OPENSIN_HEALTH_URL` | Loopback health endpoint |
| `OPENSIN_LOCK_DIR` | Atomic directory lock path |
| `OPENSIN_LOG_FILE` | Ignored local log path |

## Scheduling

Use the host's scheduler to invoke the script at a suitable interval. Keep
scheduler files and host-specific paths outside the public repository. The
script's atomic directory lock prevents overlapping runs.

## Failure handling

A failed build leaves the running container untouched. A failed start or health
check restores the previously running image tag with `--no-build`. If no prior
image exists, the script exits non-zero and requires operator intervention.
