# Critical Bugs — Build/Deploy Breaking

These bugs prevent the Docker image from building or the container stack from starting. Fix immediately.

---

## Bug #1: Dockerfile uses invalid SHA256 placeholder — build fails

**Severity:** CRITICAL
**File:** `docker/Dockerfile:17`
**Affects:** All Docker builds (single-node, prod, openshift)

### Current state
```dockerfile
FROM ubuntu:noble-20251013@sha256:<DIGEST> AS base
```

### Problem
The literal string `<DIGEST>` is not a valid SHA256 hash. Docker rejects this with:
```
invalid reference format: repository name must be lowercase
```
or more specifically:
```
failed to solve: FROM "ubuntu:noble-20251013@sha256:<DIGEST>": failed to parse
```

The comment above says "replace <DIGEST> with the real value before building in production" — but the placeholder was never replaced and committed to `main`.

### Desired state
Either:
1. Replace `<DIGEST>` with the real SHA256 of `ubuntu:noble-20251013` (obtain via `docker pull ubuntu:noble-20251013 && docker inspect --format='{{index .RepoDigests 0}}' ubuntu:noble-20251013`)
2. Or remove the `@sha256:<DIGEST>` suffix and pin only by tag (less secure but buildable)

### Fix (option 1 — recommended)
```dockerfile
FROM ubuntu:noble-20251013@sha256:1b503e1c52a08ce72a5b8eb1a8ec1ad7eafae6e5b76851f1f0b59f5c5a5e5e5e AS base
```
(Replace with real digest.)

### Fix (option 2 — quick workaround)
```dockerfile
FROM ubuntu:noble-20251013 AS base
```

### Verification
```bash
docker build -f docker/Dockerfile .
# Should complete without "invalid reference format" error
```

---

## Bug #2: docker-compose.yml references non-existent Docker Hub tag — vane sidecar fails to start

**Severity:** CRITICAL
**File:** `docker/docker-compose.yml:83`
**Affects:** `docker/docker-compose.yml` (single-node deployment with vane sidecar)

### Current state
```yaml
vane:
  image: itzcrazykns1337/vane:v1.0.0
```

### Problem
The tag `v1.0.0` does **not exist** on Docker Hub. `docker compose up` will fail with:
```
Error response from daemon: manifest for itzcrazykns1337/vane:v1.0.0 not found
```

The project's own docs already acknowledge this:
- `docs/DEPLOY-v1.14.0.md:47`: *"docker-compose.yml had `itzcrazykns1337/vane:v1.0.0` (a tag that does not exist on Docker Hub); reverted to `itzcrazykns1337/vane:latest`"*

But the fix was never applied to the compose file itself.

### Desired state
```yaml
vane:
  image: itzcrazykns1337/vane:latest
```

### Fix
```bash
sed -i 's/itzcrazykns1337\/vane:v1.0.0/itzcrazykns1337\/vane:latest/' docker/docker-compose.yml
```

### Verification
```bash
docker compose -f docker/docker-compose.yml config | grep vane
# Should show: image: itzcrazykns1337/vane:latest
```

---

## Bug #3: Dockerfile downloads Chromium without checksum verification — supply-chain risk

**Severity:** CRITICAL (Security)
**Files:**
- `docker/Dockerfile:91`
- `cloud-deployments/openshift/Dockerfile:85`

### Current state
```dockerfile
curl -fSL https://webassets.anythingllm.com/chromium-1088-linux-arm64.zip -o chrome-linux.zip && \
unzip chrome-linux.zip && \
rm -rf chrome-linux.zip
```

### Problem
The Chromium binary is downloaded from a **third-party CDN** (`webassets.anythingllm.com`) **without any integrity verification**. An attacker who compromises that CDN (or DNS) can ship a malicious Chromium binary into every OpenSIN Chat Docker image. The binary then runs with full user permissions inside the container and has access to the network for web scraping.

The Dockerfile comment even acknowledges this:
> *"SECURITY: This Chromium binary is downloaded from a third-party CDN without checksum verification. Before production use, add a SHA256 checksum check"*

### Desired state
Add SHA256 verification before unzipping:
```dockerfile
# Pin to a known-good digest. Update this when bumping the upstream version.
ARG CHROMIUM_SHA256=REPLACE_WITH_REAL_SHA256
RUN if [ "$SKIP_CHROMIUM" != "1" ]; then \
        curl -fSL https://webassets.anythingllm.com/chromium-1088-linux-arm64.zip -o chrome-linux.zip && \
        echo "${CHROMIUM_SHA256}  chrome-linux.zip" | sha256sum -c - && \
        unzip chrome-linux.zip && \
        rm -rf chrome-linux.zip; \
    fi
```

### Verification
```bash
docker build -f docker/Dockerfile --build-arg CHROMIUM_SHA256=$(sha256sum chrome-linux.zip | cut -d' ' -f1) .
# Should complete and log "chrome-linux.zip: OK"
```

### Long-term fix
Self-host the Chromium binary (e.g. on `ghcr.io/opensin-ai/chromium-arm64`) so the supply chain is fully owned.
