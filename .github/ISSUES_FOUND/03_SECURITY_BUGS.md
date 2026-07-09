# Security Bugs

These bugs have security implications ranging from information disclosure to DoS. Fix before next release.

---

## Bug #11: Collector CORS allows any origin (`origin: true`)

**Severity:** HIGH (Security)
**File:** `collector/index.js:36`

### Current state
```js
app.use(cors({ origin: true }));
```

### Problem
The collector service accepts requests from **any origin**. This means any website a user visits can make cross-origin requests to the collector (if reachable on the network) and:
- Trigger document processing (DoS via expensive operations)
- Read response data (information disclosure)
- Trigger web scraping on arbitrary URLs (SSRF)

The server (`server/app.js:153-168`) correctly validates `CORS_ORIGIN` and rejects `*`, but the collector does not.

### Desired state
Mirror the server's CORS policy:
```js
const corsOriginEnv = process.env.CORS_ORIGIN || "";
if (corsOriginEnv === "*") {
  throw new Error("CORS_ORIGIN=* is forbidden");
}
const corsOrigin = corsOriginEnv
  ? corsOriginEnv.split(",").map(s => s.trim()).filter(Boolean)
  : process.env.NODE_ENV === "production" ? false : true;
app.use(cors({ origin: corsOrigin }));
```

### Fix
Replace `collector/index.js:36` with the snippet above.

### Verification
```bash
# With CORS_ORIGIN unset in production:
NODE_ENV=production node collector/index.js
# Should throw or refuse to start

# With CORS_ORIGIN=https://app.example.com:
curl -H "Origin: https://evil.com" http://localhost:8888/process -d '{}'
# Should return CORS error
```

---

## Bug #12: Server `process.exit(1)` on uncaughtException kills in-flight requests

**Severity:** MEDIUM (Reliability)
**File:** `server/app.js:72-79`

### Current state
```js
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});
```

### Problem
Any uncaught exception or unhandled promise rejection **immediately kills the server** with `process.exit(1)`. This:
- Drops all in-flight HTTP requests (users see 502)
- Loses background job state (PDF analysis, embedding, politician sync)
- Defeats the graceful shutdown logic in `server/index.js:96-127`

The Node.js docs explicitly warn against this pattern: after `uncaughtException`, the process is in an undefined state and should be terminated, but only **after** draining in-flight work.

### Desired state
Log the error, attempt graceful shutdown, then exit:
```js
process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] Unhandled Rejection at:", promise, "reason:", reason);
  // Trigger graceful shutdown (defined in server/index.js)
  if (typeof shutdown === "function") shutdown("unhandledRejection");
  else process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
  if (typeof shutdown === "function") shutdown("uncaughtException");
  else process.exit(1);
});
```

### Fix
Move the handlers from `server/app.js` to `server/index.js` (where `shutdown()` is defined) and use the graceful path.

### Verification
```bash
# Trigger an unhandled rejection:
node -e "require('./server/index.js'); Promise.reject(new Error('test'));"
# Should log error and shut down gracefully (not kill mid-request)
```

---

## Bug #13: `prisma.$queryRawUnsafe` called with user-controlled input (SQL injection risk)

**Severity:** MEDIUM (Security — needs review)
**Files:**
- `server/models/workspaceNote.js:84,105,127`
- `server/utils/parseJobs/index.js:235`

### Current state
```js
// server/models/workspaceNote.js:84
return await prisma.$queryRawUnsafe(
  `SELECT w.id, w.name, w.slug
   FROM workspaces w
   JOIN workspace_users wu ON wu.workspace_id = w.id
   WHERE wu.user_id = ? AND w.id != ?
   ORDER BY w.name ASC`,
  Number(userId),
  Number(currentWorkspaceId),
);
```

### Assessment
**Low risk in current form** because:
- All `$queryRawUnsafe` calls use `?` placeholders with parameterized values
- Values are coerced via `Number()` before binding
- SQL strings are static (no string interpolation of user input)

### Problem
The function name `$queryRawUnsafe` is a **code smell** — it bypasses Prisma's query builder safety. A future contributor might add string interpolation without realizing the risk.

### Desired state
Replace with `$queryRaw` (template literal version) which is type-checked:
```js
return await prisma.$queryRaw`
  SELECT w.id, w.name, w.slug
  FROM workspaces w
  JOIN workspace_users wu ON wu.workspace_id = w.id
  WHERE wu.user_id = ${Number(userId)} AND w.id != ${Number(currentWorkspaceId)}
  ORDER BY w.name ASC
`;
```

### Fix
Audit all 4 call sites and migrate to `$queryRaw` (template literal). The static SQL strings make this a safe refactor.

### Verification
```bash
grep -rn "\$queryRawUnsafe\|\$executeRawUnsafe" --include="*.js" server/
# Expected: no output (or only calls with fully-static SQL + bound params)
```

---

## Bug #14: 30+ empty `catch {}` blocks swallow errors silently

**Severity:** MEDIUM (Observability)
**Files (30+):**
- `collector/processLink/convert/generic.js:201,205,263`
- `collector/processLink/helpers/htmlToMarkdown.js:135,167`
- `collector/processRawText/index.js:35`
- `collector/processSingleFile/convert/asPDF/PDFLoader/index.js:125`
- `collector/utils/OCRLoader/index.js:176,178,533,589,628,696,767`
- `collector/utils/WhisperProviders/localWhisper.js:118`
- `collector/utils/browserPool/index.js:139,154`
- `collector/utils/comKey/index.js:36,51`
- `collector/utils/downloadURIToFile/index.js:145`
- `collector/utils/extensions/PaperlessNgx/PaperlessNgxLoader/index.js:113,128,280,286`
- `collector/utils/extensions/RepoLoader/GitlabRepo/RepoLoader/index.js:87`
- `collector/utils/extensions/WebsiteDepth/index.js:66,161`
- `collector/utils/files/index.js:172,187`
- `collector/utils/url/index.js:132`

### Current state
```js
} catch {}
```

### Problem
The `.pcpm/rules.md` project rule explicitly forbids this:
> *"Never use [empty catch] to silently swallow promise rejections. Always use [logged catch] so errors are visible in logs."*

But the rule was redacted in the file (the actual code names were stripped). The pattern is still widespread — 30+ occurrences.

### Desired state
Log the error with context:
```js
} catch (err) {
  consoleLogger.warn(`[moduleName] Non-fatal error in operation X: ${err.message}`);
}
```

### Fix
Add an ESLint rule to forbid empty catch blocks:
```js
// eslint.config.js
{
  rules: {
    "no-empty": ["error", { "allowEmptyCatch": false }]
  }
}
```

Then bulk-fix the 30+ sites with a script that adds a `consoleLogger.warn` line.

### Verification
```bash
grep -rn "catch.*{}\|catch.*{}\|catch (.*) {}\|catch.*{}" --include="*.js" --include="*.ts" \
  | grep -v node_modules | grep -v __tests__
# Expected: no output
```

---

## Bug #15: dangerouslySetInnerHTML in PromptReply uses `safeMarkdown` but no DOMPurify on the rendered output

**Severity:** MEDIUM (XSS risk — needs review)
**File:** `frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/PromptReply/index.tsx:241`

### Current state
```tsx
<span
  className="flex-1 min-w-0 break-words"
  dangerouslySetInnerHTML={{
    __html: safeMarkdown(
      renderMarkdown(preprocessInlineCitations(msgToRender)),
    ),
  }}
/>
```

### Assessment
**Likely safe** because `safeMarkdown` calls `DOMPurify.sanitize` (line 63). But:
- The sanitize config (`MARKDOWN_SANITIZE_OPTS`) must be reviewed to ensure it doesn't allow `script`, `on*` handlers, or `javascript:` URLs.
- If `MARKDOWN_SANITIZE_OPTS` is misconfigured, this becomes a stored-XSS vector (LLM output → DB → render).

### Action
1. Read `frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/PromptReply/index.tsx:9-30` to verify `MARKDOWN_SANITIZE_OPTS` blocks dangerous tags/attrs.
2. Add a test that asserts `<script>alert(1)</script>` in LLM output is stripped.
3. Consider tightening the eslint rule from `warn` to `error` (currently `// Surface new unsanitized dangerouslySetInnerHTML usages (tighten to "error" later)` in `frontend/eslint.config.js:116`).

### Verification
```js
// Test case:
const malicious = "<script>alert('xss')</script><img src=x onerror=alert(1)>";
const rendered = safeMarkdown(renderMarkdown(malicious));
expect(rendered).not.toContain("<script>");
expect(rendered).not.toContain("onerror");
```

---

## Bug #16: `verifyPayloadIntegrity` allows dev bypass via env var

**Severity:** LOW (Security — dev only, but worth noting)
**File:** `collector/middleware/verifyIntegrity.js:9-18`

### Current state
```js
const DEV_BYPASS_ENABLED =
  process.env.NODE_ENV === "development" &&
  process.env.SIN_ALLOW_INSECURE_DEV_BYPASS === "true";
if (DEV_BYPASS_ENABLED) {
  comKey.log("[verifyIntegrity] Auth bypass enabled...");
  runtimeSettings.parseOptionsFromRequest(request);
  next();
  return;
}
```

### Assessment
**Safe by design** — requires both `NODE_ENV=development` AND `SIN_ALLOW_INSECURE_DEV_BYPASS=true`. The log message warns operators.

### Action
No fix needed. Consider adding a CI check that fails if `SIN_ALLOW_INSECURE_DEV_BYPASS=true` appears in any committed `.env*` file.

---

## Bug #17: `docker-healthcheck.sh` last line has misleading indentation

**Severity:** LOW (Cosmetic, but looks like a bug)
**File:** `docker/docker-healthcheck.sh:62`

### Current state
```bash
  echo "Server is up; PDF-Storage und Job/Facts-Store OK"
exit 0
```

### Problem
The `echo` line is indented with 2 spaces, making it look like it's inside an `if` block. It's actually at the top level (after the last `if [ -f "$FACTS_DB" ]; then ... fi` block). This is confusing for readers and could lead to a future contributor "fixing" the indentation and accidentally breaking the script.

### Fix
```bash
echo "Server is up; PDF-Storage und Job/Facts-Store OK"
exit 0
```

### Verification
```bash
bash -n docker/docker-healthcheck.sh
# Should pass (no syntax errors)
```

---

## Bug #18: `docker/docker-compose.yml` references external network `haus-netzwerk` that may not exist

**Severity:** MEDIUM (Deployment)
**File:** `docker/docker-compose.yml:8-10`

### Current state
```yaml
networks:
  opensin-chat:
    driver: bridge
  haus-netzwerk:
    external: true
```

### Problem
The `haus-netzwerk` network is marked `external: true`, meaning Docker expects it to already exist. On a fresh host (or CI), `docker compose up` will fail with:
```
network haus-netzwerk declared as external, but could not be found.
```

This is a deployment-specific setup (the `sin-supabase` host has this network), but the compose file is committed to the public repo and will confuse anyone trying to deploy locally.

### Desired state
Either:
1. Make `haus-netzwerk` optional (use a profile or env var), or
2. Document the prerequisite clearly at the top of the file.

### Fix (option 1)
```yaml
networks:
  opensin-chat:
    driver: bridge
  haus-netzwerk:
    external: true
    name: ${HAUS_NETZWERK_NAME:-haus-netzwerk}
    # Optional: only attach if the network exists. Comment out the
    # `networks: - haus-netzwerk` line under each service if you don't need it.
```
And document in `docker/HOW_TO_USE_DOCKER.md`:
> *The `haus-netzwerk` network is only required for the multi-host `sin-supabase` deployment. For local single-host setups, comment out the `networks: - haus-netzwerk` lines under each service.*

---

## Bug #19: `docker-healthcheck.sh` is referenced by HEALTHCHECK but may not be in image

**Severity:** LOW (Deployment)
**File:** `docker/Dockerfile` (HEALTHCHECK line) → `docker/docker-healthcheck.sh`

### Current state
```dockerfile
HEALTHCHECK --interval=1m --timeout=10s --start-period=1m \
  CMD /bin/bash /usr/local/bin/docker-healthcheck.sh || exit 1
```

### Problem
The HEALTHCHECK references `/usr/local/bin/docker-healthcheck.sh`, but I don't see a `COPY` instruction in `docker/Dockerfile` that places this file there. If the file isn't copied into the image, the healthcheck will fail every time and Docker will mark the container as unhealthy.

### Action
Verify that `docker/Dockerfile` contains:
```dockerfile
COPY docker/docker-healthcheck.sh /usr/local/bin/docker-healthcheck.sh
RUN chmod +x /usr/local/bin/docker-healthcheck.sh
```

### Verification
```bash
docker run --rm opensin-app:v1.14.0 ls -la /usr/local/bin/docker-healthcheck.sh
# Should show the file exists and is executable
docker run --rm opensin-app:v1.14.0 /bin/bash /usr/local/bin/docker-healthcheck.sh
# Should exit 0
```
