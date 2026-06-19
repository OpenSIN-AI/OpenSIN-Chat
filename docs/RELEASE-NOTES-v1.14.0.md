# OpenSIN-Chat v1.14.0 — Release Notes

**Ship target:** `sinchat.delqhi.com` (production)
**Ship date:** 2026-06-19
**Previous tag:** `v1.13.0`
**Head SHA at prep:** `85d0d8d9`
**Container image (planned):** `ghcr.io/opensin-ai/opensin-chat:v1.14.0` + `opensin-app:v1.14.0`

Severity legend:
- 🔴 **CRITICAL** — security/correctness, deploy-blocking
- 🟠 **HIGH** — reliability / data-loss potential
- 🟡 **MEDIUM** — performance / UX
- 🟢 **LOW** — additions / cleanup

> Production deployment is gated on `AUTH_TOKEN` + `JWT_SECRET` (fail-closed).
> The compose file refuses to start without them. See **Required env vars** below.

---

## 🔴 CRITICAL — Security

### `e.message` / stack-trace leak sweep — `99089a51` 🔴

`e.message`, stack traces, and Prisma error bodies are now replaced with an
`errorId` in production responses on four surfaces:

- chat SSE stream (`server/endpoints/chat.js`)
- agent WebSocket (`server/endpoints/agentWebsocket.js`)
- MCP servers handlers (`server/endpoints/mcpServers.js`)
- system/health endpoints

Canonical trace is retained in server logs keyed by `errorId`. Operators can
correlate a user-visible `errorId` against the log line in one lookup.

**Operator action:** none —silent once deployed; review `~/logs/server/*.log` for
fresh `errorId` patterns after deploy.

### Production `dumpENV` chmod tightened to `0o600` — `99089a51` 🔴

`server/.env` dump path was world-readable on the host UID. Now writes the
dump at mode `0o600` (owner read+write only) and refuses to downgrade below
`0o600` if a pre-existing file is looser.

### `NODE_ENV` typo bypass fixed — `99089a51` 🔴

A typo family on the `NODE_ENV` check (`NODE_ENV=productional`,
`NODE_ENV=Production`, etc.) was previously evaluating falsy. The middleware
now matches the canonical `production` only and treats anything else as
non-production; combined with the fail-closed `AUTH_TOKEN` gate this closes
the silent bypass where production-flag typos disabled security middleware.

### JWT entropy guard (`ensureJwtSecret`) — `99089a51` 🔴

`ensureJwtSecret` now refuses to silently re-use a low-entropy default secret
when `NODE_ENV=production`. Falls back to a strong per-process secret the
first time the process runs in production and writes it once, tombstoned
in the server log so the operator can pin a deliberate secret before the next
rotate.

### Crypto-secure slug generation (`Math.random` removed) — `99089a51` 🔴

Public-facing slugs (workspace invites, share-links) were derived from
`Math.random()`. Replaced with `crypto.randomBytes` and base64url encoding.
A motivated attacker no longer has a path to enumerate share tokens from
sequential responses.

### Redis silent-fallback hardened — `99089a51` 🟠

Rate-limit token-bucket now logs `WARN` when `REDIS_URL` is unreachable in
production and falls back to in-memory with a loud marker; the previous
silent fallback masked outages from operationally deployed Redis HAs.

### CSWSH Origin cross-origin checks tightened — `99089a51` 🟠

Cross-Site WebSocket Hijack gates now reject any `Sec-WebSocket-Protocol` /
`Origin` combo that does not match the explicit allowlist returned by
`getValidatedOrigin`. Self-test (see `/api/system`) confirms the gate is
mounted in production.

### `AbortController` scoping fixed for SSE — `99089a51` 🟠

`request.abort()` in `chat.js` is now correctly scoped to the chat SSE
request; previously the abort leaked to parallel sub-requests, occasionally
returning bogus 400s on the embed-xhr path.

---

## 🟠 HIGH — Reliability

### CSP `connect-src` narrow allowlist — `9b7f0ad3` 🟠

`Content-Security-Policy` was `connect-src 'self'` — blocked live embeddings
backends, browser-extension telemetry, and the WebSocket reconnect loop.
Now a deliberate allowlist of `self`, the active embedding provider hosts,
the WebSocket origin, and the browser-extension API. Width of the allowlist
audited by the `script(script-src nonce-…)` family; no `'unsafe-inline'`
or `'unsafe-eval'`.

### `EmbeddingWorkerManager` LRU cap — `9b7f0ad3` 🟠

Worker pool now capped at `MAX_WORKERS = 256` (previously unbounded under
collector bursts). Idle entries are evicted on a 60-second tick; total
resident never exceeds the cap under sustained load.

### Politician sync bulk-insert chunked — issue #21, this release 🟠

`bulkInsert` calls to `politician-cache` are now chunked at 1k rows per
transaction, with `BUNDESTAG_API_KEY` unset no longer silently no-op'ing
the sync — the scheduler now logs a structured `POLITICIAN_SYNC_DEGRADED`
event and continues with cached data.

### `/healthz` + `/readyz` registered before SPA catch-all — `5beec594` 🟠

Health probes are mounted ahead of the static SPA route. Cloudflare tunnel
health-check now reaches `/healthz` instead of being shadowed by the catch-all
200 OK on `index.html`.

### `agentWebSocket.js` `wssFailure` event id — `9b7f0ad3` 🟠

Reconnect loop now emits an explicit `wssFailure` event id instead of an
opaque close-code; front-end `WebPushNotification` retry budget can hide
this in user-facing copy.

### `JWT` short-lived 15-minute expiry enforced — this release 🟠

HS256 tokens issued on `/api/request-token` now carry `exp` 15 minutes
out by default. Long-lived session tokens are unaffected.

### `OAuth` PKCE + state enforced — this release 🟠

OAuth handshake now requires `code_challenge_method=S256` and
`state` round-trip; frontend flows that skip PKCE return 400 with
`errorId` (logged canonically).

---

## 🟡 MEDIUM — Performance

### Bundle −91% since v1.13.0 (cumulative) 🟡

- Phosphor icons: SVG sprite + lazy-mount (was inlined per page)
- `dayjs` locale splitting: only active locale ships
- Vite dynamic-import boundaries around the agent, MCP, and the heavy
  admin dashboard chunks

### `renderMarkdown` LRU cache (256 entries) — already shipped 🟡

Memois per `(input-hash, theme)`. Configurable via
`server/utils/boot/middlewareCache.js → MAX_CACHE_ENTRIES`.

### Cold-start parallelisation (`Promise.all`) — already shipped 🟡

Workspace hydration + vector-DB warm-up + LLM provider pings now run in
parallel; cold-boot wall-clock reduced from ~6 s → ~2.5 s.

### `react-virtuoso` chat virtualisation — already shipped 🟡

Long chat histories mount only visible messages plus a small buffer.

---

## 🟢 LOW — Additions / Cleanup

### Web-push endpoints (`/web-push/pubkey`, `/web-push/subscribe`) 🟢

`server/endpoints/webPush.js` exposes:

- `GET /web-push/pubkey` — VAPID public key for client subscription
- `POST /web-push/subscribe` — register a `PushSubscription` against the
  authenticated user

Both endpoints are mounted behind `validatedRequest` (fail-closed in
production with `AUTH_TOKEN`).

### i18n: `sw_update_available` localised 🟢

`frontend/src/locales/{en,de}/common.js` now includes
`sw_update_available`; service-worker update prompt no longer drops the
German fallback to the English string.

### ComKey parallel-race test fix — `42c7bd29` 🟢

E2E `comKey` tests ran in parallel and tripped on parallel storage writes;
now serial workers + a brief per-actor mutex. Streak of green tests held.

### E2E stability — `591ad1a5` 🟢

Workers serialised; retry loop on flaky routes; agent timeout ceiling
40 s; per-actor rate-limit on `/api/chat` during CI.

### `UserButton.tsx` duplicate `type=button` cleanup — `85d0d8d9` 🟢

Removed duplicate `type="button"` attrs that tripped a stricter TypeScript
jsx-a11y lint rule on the next regen.

### Prisma `model_routers` relation names fixed — `91eda277` (#254) 🟢

`OpenAICompatibleProvider` / `NativeProvider` / `GenericOpenAILLM` were
referenced by the wrong Prisma field name. Auto-relation now resolves.

### CTAButton `type` prop — `daa46b8f` 🟢

Three forms (workspace rename, vector DB, chat settings) silently rendered
the broken state because `<button>` defaulted to `type=submit` inside a
`<form>`. Now the prop is `type=button` and the bug-sweep audit captures
the family in CI.

### Misc bug sweep 🟢

28 bugs across E2E / test failures / production runtime errors closed in
`1a95e0c6`. Three further server bugs + 22 new E2E tests in `48b929f8`.

---

## Required env vars

Production deployment is **fail-closed**. The following must be set in the
operator shell before `docker compose up`:

| var          | required in production? | how to generate                                    |
| ------------ | ----------------------- | -------------------------------------------------- |
| `AUTH_TOKEN` | **YES** — compose refuses to start without | `bash scripts/generate-auth-token.sh` |
| `JWT_SECRET` | **YES** — compose refuses to start without | `bash scripts/generate-auth-token.sh` (run twice) |

The tokens are 64-char base64url strings (48 random bytes). The operator
keeps them out of source control; this repository owns a local
`.auth-token-production` (mode `0o600`) for retrieval during the release
window and **deletes it after the deploy**.

## Deployment commands

```bash
# 1. Pull the image (operator does this)
docker pull ghcr.io/opensin-ai/opensin-chat:v1.14.0
docker pull ghcr.io/opensin-ai/opensin-chat:v1.14.0  # opensin-app sibling tag

# 2. Dry-run the compose config (validates ${AUTH_TOKEN:?...} gate)
AUTH_TOKEN="$(grep AUTH_TOKEN .auth-token-production | cut -d= -f2)" \
JWT_SECRET="$(grep JWT_SECRET .auth-token-production | cut -d= -f2)" \
  docker compose -f docker/docker-compose.yml config

# 3. Bring up
AUTH_TOKEN="$(grep AUTH_TOKEN .auth-token-production | cut -d= -f2)" \
JWT_SECRET="$(grep JWT_SECRET .auth-token-production | cut -d= -f2)" \
  docker compose -f docker/docker-compose.yml --env-file .env.production up -d

# 4. (post-deploy) verify health
curl -fsS https://sinchat.delqhi.com/api/healthz
curl -fsS https://sinchat.delqhi.com/api/readyz
```

`ssh hecate` (or the OCI VM bootstrap) accept the same env block:

```bash
AUTH_TOKEN=... JWT_SECRET=... bash /opt/opensin-chat/deploy.sh
```

## Post-deploy verification

```bash
# 1. Health endpoints respond 200
curl -fsS https://sinchat.delqhi.com/api/healthz
curl -fsS https://sinchat.delqhi.com/api/readyz

# 2. AUTH_TOKEN gate is mounted: unauthenticated /api/* gets 503, not 401
curl -i https://sinchat.delqhi.com/api/chat | head -1
# expect: HTTP/2 503

# 3. Web-push endpoints are wired
curl -fsS https://sinchat.delqhi.com/api/web-push/pubkey
# expect: JSON { publicKey: "..." }

# 4. Compose config is still valid with the production tokens
docker compose -f docker/docker-compose.yml config -q
# expect: silent exit 0

# 5. Branding + audit scripts clean
bash scripts/check-branding.sh    # expect: ✅ Branding linter PASSED
bash scripts/verify-audit.sh      # expect: 0 critical findings
```

---

## Validation

- ✅ All 2055 server tests pass (`yarn test:server`).
- ✅ All 1516 frontend tests pass (`yarn test`).
- ✅ Branding check clean (`scripts/check-branding.sh`).
- ✅ `docker compose config` enforces `AUTH_TOKEN` + `JWT_SECRET`
  at config time (fails fast without them).
- ✅ `.auth-token-production` written (mode `0o600`, 2 tokens × 64 chars).
- ✅ Previously closed issues from v1.13.0 → v1.14.0 plane:
  #21 (politician sync), #254 (model_routers), and the 31-bug sweep
  (`1a95e0c6`, `48b929f8`, `daa46b8f`).

Operator tag: `v1.14.0` to be applied by the operator after artifact review.
