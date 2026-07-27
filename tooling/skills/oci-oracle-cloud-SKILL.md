# OCI deployment operations

> Public, provider-neutral operating guidance for OpenSIN Chat.
> Production inventory, addresses, SSH users, keys, tunnel identifiers,
> container names, ports, and absolute paths must never be stored here.

## Security boundary

Keep deployment-specific values in an ignored operator file such as:

```text
.local/operations/oci.env
```

That file must remain untracked and should be readable only by its owner. A
password manager or secret manager is preferred for credentials. Never print
secret values in logs, task evidence, issues, commits, or chat messages.

## Required operator variables

The maintained scripts fail closed until their required values are supplied.
Typical non-secret variables include:

```env
DEPLOY_HOST=
REMOTE_REPO_DIR=
COMPOSE_PROJECT_NAME=
COMPOSE_SERVICE=
LOCAL_HEALTH_URL=
PUBLIC_HEALTH_URL=
TUNNEL_SERVICE=
```

SSH aliases, host addresses, usernames, key paths, tunnel identifiers, internal
ports, service names, and production filesystem paths belong only in private
operator configuration.

## Safe verification order

1. Confirm the intended SSH alias resolves from the operator machine.
2. Confirm the remote host identity before changing anything.
3. Verify the remote checkout commit and a clean worktree.
4. Verify the configured Compose service and immutable image reference.
5. Probe the private health endpoint from the host.
6. Probe the public health endpoint externally.
7. Record only commit SHAs, exit status, HTTP status, and redacted diagnostics.

## Deployment

Use the repository deployment helper with explicit environment configuration:

```bash
set -a
. .local/operations/oci.env
set +a
./tooling/scripts/deploy-production.sh
```

The deployment helper requires an explicit target, checks for a clean remote
checkout, resolves the target commit, builds an image tagged with the full
commit SHA, starts that image, and verifies health before reporting success.

## Recovery

Use the fail-closed recovery helper only after loading private operator values:

```bash
set -a
. .local/operations/oci.env
set +a
./tooling/scripts/oci-vm-bootstrap/emergency-recover.sh
```

The helper does not contain or infer production addresses, users, paths, ports,
container names, or tunnel identifiers.

## Incident evidence

Acceptable public evidence:

- remote commit SHA;
- image tag or digest with no registry credential;
- command exit code;
- HTTP status code and timestamp;
- sanitized test summary.

Never publish host inventory, IP addresses, SSH configuration, internal network
layout, absolute home paths, container inventories, tunnel credentials, or
secret values.
