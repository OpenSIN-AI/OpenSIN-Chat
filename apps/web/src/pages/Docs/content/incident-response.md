# Incident response

This runbook describes the public process for handling an OpenSIN Chat service
incident. Production inventory and credentials are intentionally excluded.

## Security rule

Never add production IP addresses, SSH users, key paths, tunnel identifiers,
internal ports, container names, absolute host paths, environment values, or
credentials to this document, issues, commits, task evidence, or chat logs.

Load deployment-specific values from an ignored operator file under
`.local/operations/` or from a secret manager.

## Severity

- **SEV-1:** public service unavailable, authentication bypass, confirmed secret
  exposure, destructive data loss, or active compromise.
- **SEV-2:** core feature unavailable, repeated crashes, failed deployment, or
  material degradation without confirmed compromise.
- **SEV-3:** isolated feature defect with a safe workaround.

## First response

1. Record the UTC start time and affected public endpoint.
2. Stop deployments and unrelated changes.
3. Preserve logs and evidence without printing secret-bearing environment data.
4. Verify external reachability and the expected TLS certificate.
5. Verify the intended remote host identity.
6. Verify the checked-out commit and a clean remote worktree.
7. Verify the configured Compose service and immutable image tag or digest.
8. Verify private and public health endpoints.

## Recovery

Use the fail-closed recovery helper only after loading private configuration:

```bash
set -a
. .local/operations/oci.env
set +a
./tooling/scripts/oci-vm-bootstrap/emergency-recover.sh
```

The helper requires explicit target, repository, service, and health values. It
must not infer production infrastructure from repository content.

## Suspected credential exposure

1. Revoke or rotate the affected credential at its source.
2. Invalidate sessions and dependent tokens where applicable.
3. Update the secret manager and deployment environment.
4. Redeploy or restart only the affected services.
5. Run a repository and Git-history secret scan.
6. Record the credential class and rotation timestamp, never the value.

## Deployment rollback

1. Identify the last verified commit SHA and image digest privately.
2. Confirm the rollback image exists locally or in the trusted registry.
3. Deploy only that immutable image.
4. Verify internal health, public health, authentication, chat, retrieval, and
   document upload.
5. Keep the failed image and sanitized logs until the incident review ends.

## Evidence that may be published

- timestamps;
- commit SHAs;
- image tags or digests without registry credentials;
- command exit codes;
- HTTP status codes;
- sanitized test summaries;
- affected feature names.

## Post-incident review

Within the project workflow, document the root cause, detection gap, recovery
steps, tests added, and preventive change. Store private infrastructure details
only in the protected operator system, not in this repository.
