# Branding & Wrong-Reference Bugs

These bugs leak the wrong GitHub org name (`Family-Team-Projects`) and stale upstream branding (`AnythingLLM` / `Mintplex`) into user-facing strings, docs, and code paths. They violate the project's own branding policy (`scripts/check-branding.sh`) and `docs/MASTER-PLAN.md:67` lists them as known open work.

---

## Bug #4: Wrong GitHub org `Family-Team-Projects` in user-facing locale strings

**Severity:** HIGH (User-facing)
**Files (10+):**
- `frontend/src/locales/de/common.js:4311` — German telemetry explanation
- `frontend/src/locales/en/common.js:4212` — English telemetry explanation
- `frontend/src/utils/paths.ts:69` — `GITHUB_URL` constant
- `frontend/src/pages/Docs/content/api.md:1158,1164`
- `frontend/src/pages/Docs/content/docker-deployment.md:215`
- `docs/api.md:1158,1164`
- `docs/DOCKER-DEPLOYMENT.md:215`
- `collector/utils/runtimeSettings/index.js:55` — code comment
- `extras/support/announcements/2026-01-12.json:21` — in-app announcement
- `locales/README.fa-IR.md:4,8,20,43,130,165,166` — Farsi README

### Current state (example)
```js
// frontend/src/locales/de/common.js:4311
'Alle Ereignisse zeichnen keine IP-Adresse auf ... auf <a href="https://github.com/search?q=repo%3AFamily-Team-Projects%2Fopensin-chat%20.sendTelemetry(&amp;type=code" ...>GitHub</a> nachsehen.'
```

### Problem
The link points to `Family-Team-Projects/opensin-chat` which **does not exist** on GitHub. Users clicking the link get a 404. The correct org is `OpenSIN-AI`.

Also affects the announcement JSON — users see a broken "more info" link in the support banner.

### Desired state
Replace `Family-Team-Projects` → `OpenSIN-AI` everywhere.

### Fix (one-liner)
```bash
# From repo root:
grep -rl "Family-Team-Projects" --include="*.js" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" --include="*.yml" --include="*.yaml" \
  | xargs sed -i 's|Family-Team-Projects|OpenSIN-AI|g'
```

### Verification
```bash
grep -rn "Family-Team-Projects" --include="*.js" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" --include="*.yml" --include="*.yaml" . | grep -v node_modules
# Expected: no output
```

### Note
`docs/MASTER-PLAN.md:67` already lists this as an open task:
> *"Falsche GitHub-Links korrigieren (`Family-Team-Projects/OpenSIN-Chat` → `OpenSIN-AI/OpenSIN-Chat`)"*

---

## Bug #5: `ANYTHINGLLM_FETCH_TIMEOUT` / `ANYTHINGLLM_MAX_RETRIES` env vars still in code

**Severity:** MEDIUM (Branding violation)
**Files:**
- `server/utils/boot/patchSdkTimeouts.js:13,20,21,29,40` — reads env vars
- `server/utils/helpers/updateENV/dumpENV.js:93,94` — exports env var names
- `server/utils/collectorApi/index.js:89` — reads `ANYTHINGLLM_CHROMIUM_ARGS`
- `server/.env.example:591` — commented example
- `docker/.env.example:526` — commented example

### Current state
```js
// server/utils/boot/patchSdkTimeouts.js:20
const envDefinedTimeout = process.env.ANYTHINGLLM_FETCH_TIMEOUT;
```

### Problem
The branding policy (`scripts/check-branding.sh`) forbids `AnythingLLM` strings outside the whitelist. `patchSdkTimeouts.js` is whitelisted with a comment, but the env var names themselves still leak the old brand into runtime logs and operator-facing docs.

### Desired state
Rename env vars to `OPENSIN_FETCH_TIMEOUT` / `OPENSIN_MAX_RETRIES` / `OPENSIN_CHROMIUM_ARGS` and keep the old names as deprecated aliases for one release cycle.

### Fix
```js
// server/utils/boot/patchSdkTimeouts.js
const envDefinedTimeout = process.env.OPENSIN_FETCH_TIMEOUT
  ?? process.env.ANYTHINGLLM_FETCH_TIMEOUT; // deprecated alias
const envDefinedMaxRetries = process.env.OPENSIN_MAX_RETRIES
  ?? process.env.ANYTHINGLLM_MAX_RETRIES; // deprecated alias
```
And log a deprecation warning when the old name is used.

### Verification
```bash
grep -rn "ANYTHINGLLM_FETCH_TIMEOUT\|ANYTHINGLLM_MAX_RETRIES\|ANYTHINGLLM_CHROMIUM_ARGS" \
  --include="*.js" --include="*.ts" --include="*.json" --include="*.env*" \
  | grep -v node_modules
# Expected: only deprecated-alias fallback lines
```

---

## Bug #6: `anythingllm-logo.png` / `anythingllm-logo-dark.png` legacy filenames in code

**Severity:** LOW (Branding violation, but intentional shim)
**Files:**
- `server/utils/files/logo.js:22,23,58`
- `server/__tests__/endpoints/system.test.js:113`

### Current state
```js
// server/utils/files/logo.js:22
const DEFAULT_LOGO_FILENAMES = [
  LOGO_FILENAME,
  LOGO_FILENAME_DARK,
  "anythingllm-logo.png",
  "anythingllm-logo-dark.png",
];
```

### Problem
The branding linter allows this file (it's whitelisted), but the legacy filenames are still referenced. The comment correctly explains this is a "compatibility shim" for users migrating from AnythingLLM. This is intentional and OK — but the file should be **removed from the whitelist** once the migration window closes (suggest: 6 months after v1.14.0).

### Action
- No immediate fix needed.
- Add a `DEPRECATION_REMOVAL_DATE` constant and a TODO comment with the removal date.
- After that date, remove the legacy filenames and the shim function.

### Suggested change
```js
// server/utils/files/logo.js
const LEGACY_LOGO_REMOVAL_DATE = "2027-01-01"; // 6 months after v1.14.0 GA
// TODO: After LEGACY_LOGO_REMOVAL_DATE, drop the AnythingLLM fallback filenames
//       and the getLegacyDefaultFilename() function.
```

---

## Bug #7: `docs.anythingllm.com` URLs in `.env.example` files

**Severity:** LOW (Documentation)
**Files:**
- `docker/.env.example:8,466,473,479`
- `server/.env.example:564,571,577`

### Current state
```bash
# docker/.env.example:8
# JWT_EXPIRY="30d" # (optional) https://docs.anythingllm.com/configuration#custom-ttl-for-sessions
```

### Problem
These URLs point to the old AnythingLLM docs site. Either:
1. The docs at those URLs don't exist anymore (404), or
2. They exist but describe AnythingLLM-specific behavior that may not match OpenSIN Chat.

### Desired state
Replace with `https://docs.opensin.delqhi.com/configuration/...` or remove the URL entirely.

### Fix
```bash
sed -i 's|https://docs.anythingllm.com|https://docs.opensin.delqhi.com|g' \
  docker/.env.example server/.env.example
```

### Verification
```bash
grep -rn "docs.anythingllm.com" --include="*.env*" .
# Expected: no output
```

---

## Bug #8: `webassets.anythingllm.com` Chromium download URL

**Severity:** MEDIUM (Supply-chain + branding)
**Files:**
- `docker/Dockerfile:91`
- `cloud-deployments/openshift/Dockerfile:85`

### Current state
```dockerfile
curl -fSL https://webassets.anythingllm.com/chromium-1088-linux-arm64.zip -o chrome-linux.zip
```

### Problem
Same supply-chain concern as Bug #3, plus branding leak. The URL embeds the old brand name.

### Desired state
Self-host the binary at `https://github.com/OpenSIN-AI/opensin-chat/releases/download/v1.14.0/chromium-1088-linux-arm64.zip` (or a dedicated `opensin-chromium` repo).

### Fix
After self-hosting, update both Dockerfiles:
```dockerfile
ARG CHROMIUM_VERSION=1088
ARG CHROMIUM_SHA256=REPLACE_WITH_REAL_SHA256
RUN curl -fSL "https://github.com/OpenSIN-AI/opensin-chat/releases/download/v${OPENSIN_VERSION}/chromium-${CHROMIUM_VERSION}-linux-arm64.zip" \
      -o chrome-linux.zip && \
    echo "${CHROMIUM_SHA256}  chrome-linux.zip" | sha256sum -c - && \
    unzip chrome-linux.zip && \
    rm -rf chrome-linux.zip
```

---

## Bug #9: `LLM_PROVIDER='anythingllm-router'` still in `server/.env.example`

**Severity:** LOW (Branding)
**File:** `server/.env.example:265`

### Current state
```bash
# LLM_PROVIDER='anythingllm-router'
```

### Problem
The provider name `anythingllm-router` is a legacy identifier kept for DB backward compatibility (`BRANDING.md:26`). The env example still references it, which leaks the old brand into operator-facing config docs.

### Desired state
Either:
1. Replace with the new provider name (if `anythingllm-router` was renamed), or
2. Add a comment explaining it's a legacy DB identifier and the actual provider is now `generic-openai`.

### Fix
```bash
# server/.env.example:265
# LLM_PROVIDER='generic-openai'  # was 'anythingllm-router' (kept as DB alias)
```

---

## Bug #10: `collector/utils/runtimeSettings/index.js` comment references wrong org

**Severity:** LOW (Code comment)
**File:** `collector/utils/runtimeSettings/index.js:55`

### Current state
```js
* see #attachOptions https://github.com/Family-Team-Projects/opensin-chat/blob/ebf112007e0d579af3d2b43569db95bdfc59074b/server/utils/collectorApi/index.js#L18
```

### Problem
Code comment links to a non-existent GitHub URL.

### Fix
```js
* see #attachOptions https://github.com/OpenSIN-AI/OpenSIN-Chat/blob/main/server/utils/collectorApi/index.js#L18
```
