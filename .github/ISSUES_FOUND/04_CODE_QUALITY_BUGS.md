# Code Quality & Hygiene Bugs

These bugs don't break functionality but cause friction for contributors, bloat the repo, or hide real problems.

---

## Bug #20: Empty placeholder files at repo root keep reappearing

**Severity:** LOW (Hygiene)
**Files:**
- `test-file.txt` (0 bytes)
- `test-mcp-probe.txt` (0 bytes)
- `test_probe.txt` (0 bytes)
- `PR_DESCRIPTION.md` (0 bytes)
- `frontend/eslint-i18n-warnings.json` (0 bytes)

### Problem
These 5 empty files keep getting committed and then removed. Git history shows the pattern:
```
cfada941c chore: remove stray test files from earlier debugging
a87e8f2f4 chore: remove empty stray test files
465b13eb2 chore: remove stray test files
02999e1c3 chore: clean up stray files from test commits
dbb7e7bbb chore: remove test_probe.txt (was a test commit, not intended)
```

The root cause is that contributors create these files when debugging and forget to delete them before committing. They serve no purpose.

### Desired state
1. Add to `.gitignore`:
```
# Stray debug files that keep reappearing
test-file.txt
test-mcp-probe.txt
test_probe.txt
PR_DESCRIPTION.md
frontend/eslint-i18n-warnings.json
```
2. Remove the existing files from the repo.
3. Add a pre-commit hook that fails if any of these files are staged.

### Fix
```bash
# Remove existing files
git rm test-file.txt test-mcp-probe.txt test_probe.txt PR_DESCRIPTION.md frontend/eslint-i18n-warnings.json

# Add to .gitignore
cat >> .gitignore << 'EOF'

# Stray debug files that keep reappearing (Bug #20)
test-file.txt
test-mcp-probe.txt
test_probe.txt
PR_DESCRIPTION.md
frontend/eslint-i18n-warnings.json
EOF
```

### Verification
```bash
ls -la test-file.txt test-mcp-probe.txt test_probe.txt PR_DESCRIPTION.md frontend/eslint-i18n-warnings.json 2>&1
# Expected: "No such file or directory" for all
```

---

## Bug #21: `.pcpm/rules.md` has redacted/empty placeholders

**Severity:** LOW (Documentation)
**File:** `.pcpm/rules.md`

### Current state
```markdown
- [2026-06-09T05:24:26.454Z] Never use  to silently swallow promise rejections. Always use  so errors are visible in logs. (priority: -1)
```

### Problem
The rule text has empty placeholders where specific code patterns should be. The last rule in the file explicitly says:
> *"KEINE Sicherheitswarnungen/Hinweise dazu — nach der Demo-Vorstellung werden frische Secrets erzeugt und die History gepurged. Dieses Thema ist abgeschlossen und wird nicht weiter diskutiert."*

So the redaction is intentional for the secrets-related rule. But the other rules (e.g. the "Never use [empty] to silently swallow promise rejections" rule) appear to be missing the actual code names.

### Desired state
Either:
1. Re-add the redacted code names (they're not secrets, just code patterns), or
2. Move the rules to a proper format (e.g. `.eslintrc` rules) so they don't need prose.

### Fix (option 1)
Replace the empty placeholders with the actual code patterns:
```markdown
- Never use `catch {}` to silently swallow promise rejections. Always use `catch (err) { logger.warn(...) }` so errors are visible in logs.
- For all OpenAI-compatible local/self-hosted providers, NEVER use `apiKey: null` in the OpenAI SDK constructor. Always use `apiKey: "placeholder-string"` with a placeholder string.
```

### Verification
```bash
grep -c "^.*  .*  " .pcpm/rules.md
# Should be 0 (no double-empty patterns)
```

---

## Bug #22: 107 `console.log/error/warn` calls in server code

**Severity:** LOW (Observability)
**Files:** 107 occurrences across `server/`

### Problem
The server has 107 direct `console.*` calls. Many should use the structured `consoleLogger` instead:
- `console.error` for errors → `consoleLogger.error` (adds timestamp, log level)
- `console.log` for info → `consoleLogger.log`
- `console.warn` for warnings → `consoleLogger.warn`

The `consoleLogger` writes to a structured log file that can be parsed by log aggregators. Direct `console.*` calls go to stdout/stderr only and are lost in containerized deployments that don't capture stdout.

### Desired state
Replace all `console.*` in `server/` (except in `consoleLogger` itself) with `consoleLogger.*`.

### Fix
```bash
# Find all console.* calls in server/
grep -rn "console\.\(log\|error\|warn\|info\|debug\)" --include="*.js" server/ \
  | grep -v node_modules | grep -v __tests__ | grep -v "utils/logger"
```

Then bulk-replace with a script that:
1. Imports `consoleLogger` at the top of each file
2. Replaces `console.log` → `consoleLogger.log`, etc.
3. Preserves `// eslint-disable-next-line no-console` comments

### Verification
```bash
grep -rn "console\.\(log\|error\|warn\|info\|debug\)" --include="*.js" server/ \
  | grep -v node_modules | grep -v __tests__ | grep -v "utils/logger" | wc -l
# Expected: 0 (or only legitimate cases with eslint-disable comments)
```

---

## Bug #23: `frontend/public/embed/opensin-chat-widget.min.js` is 715KB minified bundle in repo

**Severity:** LOW (Repo size)
**File:** `frontend/public/embed/opensin-chat-widget.min.js` (715,967 characters)

### Problem
A 715KB minified JavaScript bundle is committed to the repo. This:
- Bloats `git clone` time
- Makes diffs unreadable
- Should be a build artifact, not source

### Desired state
The widget should be built from source and the output should be:
1. Excluded from git (add to `.gitignore`)
2. Built as part of `npm run build` (already does this via `frontend/scripts/postbuild.js`)
3. Served from `server/public/embed/` at runtime

### Fix
```bash
# Add to .gitignore
echo "frontend/public/embed/opensin-chat-widget.min.js" >> .gitignore

# Remove from repo
git rm frontend/public/embed/opensin-chat-widget.min.js

# Verify build still produces it
cd frontend && npm run build
ls -la public/embed/opensin-chat-widget.min.js
```

### Verification
```bash
ls -la frontend/public/embed/opensin-chat-widget.min.js
# Expected: file exists locally (build artifact) but not in git
git ls-files frontend/public/embed/
# Expected: empty
```

---

## Bug #24: `setInterval` in frontend components without cleanup on unmount

**Severity:** MEDIUM (Memory leak)
**Files:**
- `frontend/src/pages/PdfAnalysis/CrossCheckPanel.tsx:93`
- `frontend/src/pages/PdfAnalysis/components/JobsPanel.tsx:44`
- `frontend/src/utils/keyboardShortcuts.ts:160`

### Current state (example)
```tsx
// frontend/src/pages/PdfAnalysis/CrossCheckPanel.tsx:93
useEffect(() => {
  const interval = setInterval(refresh, 4000);
  // ... no cleanup!
}, [refresh]);
```

### Problem
`setInterval` is started in `useEffect` but never cleared. When the component unmounts (user navigates away), the interval keeps firing, calling `refresh()` which makes HTTP requests and updates state on an unmounted component (React warning: "Can't perform a React state update on an unmounted component").

This is a **classic React memory leak** that grows over a user's session.

### Desired state
```tsx
useEffect(() => {
  const interval = setInterval(refresh, 4000);
  return () => clearInterval(interval);  // ← cleanup
}, [refresh]);
```

### Fix
Add cleanup to all 3 files. Pattern:
```tsx
useEffect(() => {
  const interval = setInterval(fn, ms);
  return () => clearInterval(interval);
}, [deps]);
```

### Verification
```bash
# After fix, navigate to /pdf-analysis, then away, then check browser memory
# Or use React DevTools Profiler to verify no leaked intervals
grep -rn "setInterval" --include="*.tsx" --include="*.ts" frontend/src/ \
  | grep -v __tests__ | grep -v "clearInterval"
# Expected: no output (every setInterval has a matching clearInterval)
```

---

## Bug #25: `addEventListener` in frontend hooks without cleanup

**Severity:** MEDIUM (Memory leak)
**Files:**
- `frontend/src/components/WorkspaceChat/ChatContainer/DnDWrapper/index.tsx:596`
- `frontend/src/components/WorkspaceChat/index.tsx:199`
- `frontend/src/hooks/useAgentForm.ts:98`
- `frontend/src/hooks/useUnsavedChanges.ts:27`
- `frontend/src/pages/Admin/Agents/useAgents.ts:156`

### Current state (example)
```ts
// frontend/src/hooks/useUnsavedChanges.ts:27
useEffect(() => {
  const handler = (e) => { /* ... */ };
  window.addEventListener("beforeunload", handler);
  // ... no cleanup!
}, []);
```

### Problem
Same pattern as Bug #24 — `addEventListener` without `removeEventListener` cleanup leaks listeners across re-renders and component remounts.

### Desired state
```ts
useEffect(() => {
  const handler = (e) => { /* ... */ };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, []);
```

### Fix
Add cleanup to all 5 files.

### Verification
```bash
grep -rn "addEventListener" --include="*.tsx" --include="*.ts" frontend/src/ \
  | grep -v __tests__ | grep -v "removeEventListener"
# Expected: no output
```

---

## Bug #26: TODO/FIXME markers in production code without issue links

**Severity:** LOW (Documentation)
**Files (30+):**
- `collector/processLink/helpers/index.js:159`
- `collector/utils/constants.js:9,66` — `// TODO: Create asDoc.js`
- `collector/utils/runtimeSettings/index.js:15`
- `frontend/eslint.config.js:144`
- `tests/errors.test.js:170,176,180`
- `tests/experimental.test.js:162,168,174,180,191`

### Problem
TODO/FIXME comments without issue links become permanent. They accumulate and nobody knows which ones are still relevant.

### Desired state
Every TODO/FIXME should reference a GitHub issue: `// TODO(#123): ...`

### Fix
1. Audit all TODO/FIXME comments
2. Create issues for each (or close as "won't fix")
3. Update the comments to reference the issue number

### Verification
```bash
grep -rn "TODO\|FIXME" --include="*.js" --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | grep -v __tests__ | grep -v "TODO(#" | wc -l
# Expected: 0 (all TODOs reference an issue)
```

---

## Bug #27: `AfDPresse` extension is party-specific but named generically

**Severity:** LOW (Branding/Neutrality)
**Files:**
- `collector/utils/extensions/AfDPresse/index.js`
- `collector/utils/extensions/AfDPresse/README.md`

### Problem
The project is branded as politically neutral ("OpenSIN Chat — sovereign, self-hosted AI workspace for political research"). But there's a dedicated extension for scraping press releases from one specific German political party (AfD). This:
- Undermines the neutrality claim
- May violate German political balance requirements for public-sector deployments
- Makes the project look partisan

### Desired state
Either:
1. Rename to a generic "GermanPartyPress" extension that supports multiple parties (CDU, SPD, Grüne, Linke, FDP, AfD, etc.), or
2. Move to a separate `extras/` directory clearly marked as "third-party political extensions" with a disclaimer.

### Action
Discuss with maintainers. This is a political/branding decision, not a pure code fix.

---

## Bug #28: `frontend/src/utils/constants.ts` has 22 legacy `openafd_*` keys

**Severity:** LOW (Migration debt)
**File:** `frontend/src/utils/constants.ts:19-43`

### Current state
```ts
// Legacy key mapping for migration from openafd_ → opensin_ prefix.
export const LEGACY_STORAGE_KEYS = {
  openafd_user: AUTH_USER,
  openafd_authToken: AUTH_TOKEN,
  // ... 20 more
};
```

### Problem
The legacy `openafd_*` localStorage keys are kept for backward compatibility with users migrating from the old brand. This is intentional and documented. But:
- No removal date is set
- The mapping grows over time
- After 6-12 months, all users should have migrated

### Desired state
Add a `LEGACY_KEY_REMOVAL_DATE` constant and a TODO to remove the mapping after that date.

### Fix
```ts
// frontend/src/utils/constants.ts
export const LEGACY_KEY_REMOVAL_DATE = "2027-01-01"; // 6 months after v1.14.0 GA
// TODO: After LEGACY_KEY_REMOVAL_DATE, drop LEGACY_STORAGE_KEYS and the
//       migration logic in safeStorage.ts.
```

---

## Bug #29: `docker/docker-compose.yml` uses `image:` AND `build:` for `opensin-chat` service

**Severity:** LOW (Confusing)
**File:** `docker/docker-compose.yml:32-33`

### Current state
```yaml
opensin-chat:
  image: opensin-app:v1.14.0
  build:
    context: ../
    dockerfile: ./docker/Dockerfile
```

### Problem
When both `image:` and `build:` are specified, Docker Compose builds the image AND tags it with the `image:` name. This works but is confusing — readers don't know if the service uses a pre-built image or builds from source.

### Desired state
Use a comment to clarify, or split into two compose files (one for `docker compose build`, one for `docker compose pull`).

### Fix
```yaml
opensin-chat:
  # If the image 'opensin-app:v1.14.0' exists locally, use it.
  # Otherwise, build from source using the Dockerfile below.
  # To force a rebuild: docker compose build --no-cache
  image: opensin-app:v1.14.0
  build:
    context: ../
    dockerfile: ./docker/Dockerfile
```

---

## Bug #30: `docker/fix-permissions.sh` only fixes `server/storage` but compose also mounts `collector/hotdir` and `collector/outputs`

**Severity:** LOW (Deployment)
**File:** `docker/fix-permissions.sh`

### Current state
```bash
if [ -d "$PROJECT_ROOT/server/storage" ]; then
  chown -R "${UID_TARGET}:${GID_TARGET}" "$PROJECT_ROOT/server/storage"
fi
```

### Problem
The compose file mounts 3 volumes:
- `../server/storage:/app/server/storage`
- `../collector/hotdir/:/app/collector/hotdir`
- `../collector/outputs/:/app/collector/outputs`

But `fix-permissions.sh` only fixes the first one. If `collector/hotdir` or `collector/outputs` are owned by root (e.g. created by a previous container run with different UID), the new container can't write to them and document ingestion fails.

### Desired state
```bash
# Also fix collector directories
for dir in "$PROJECT_ROOT/server/storage" "$PROJECT_ROOT/collector/hotdir" "$PROJECT_ROOT/collector/outputs"; do
  if [ -d "$dir" ]; then
    echo "  Fixing $dir ..."
    chown -R "${UID_TARGET}:${GID_TARGET}" "$dir"
  else
    mkdir -p "$dir"
    chown "${UID_TARGET}:${GID_TARGET}" "$dir"
  fi
done
```

### Verification
```bash
bash docker/fix-permissions.sh
ls -la collector/hotdir collector/outputs
# Expected: both owned by ${UID}:${GID}
```
