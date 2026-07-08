# OpenSIN-Chat — Changelog

All notable changes to **OpenSIN-Chat** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased] — 2026-07-08 — audit-report sprint: Issues #1–#10 (7/10 closed)

### Fixed

- **Issue #1 — Prisma deploy pipeline:** `prisma migrate deploy` runs automatically
  on every container start via the entrypoint script. Schema drift no longer requires
  manual intervention.

- **Issue #2 — ENV → DB auto-migration on boot:** All `SETTINGS_*` environment variables
  are automatically migrated into the database on first boot. No manual SQL required.

- **Issue #4 — Settings rollback endpoint:** `POST /api/system/settings/rollback`
  endpoint added. Settings changes are now reversible in production.

- **Issue #5 — text-white opacity variants → semantic tokens (173/173 migrated):**
  All `text-white/20` through `text-white/90` opacity classes replaced with
  `text-theme-text-primary`, `text-theme-text-secondary`, and `text-theme-placeholder`
  across 87 component files. 118 intentional `text-white` occurrences on colored
  backgrounds remain and are documented.

- **INEFFECTIVE_DYNAMIC_IMPORT build warnings fixed:** `frontend/src/pages/Admin/Agents/SkillPanel.tsx`
  had static imports of `FlowPanel`, `ServerPanel`, and `ImportedSkillConfig` while
  `index.tsx` lazily imported the same modules. Removed static imports from SkillPanel
  and replaced direct component usage with the `SelectedSkillComponent` prop already
  passed from `DesktopForm`. All 3 lazy chunks now code-split correctly.

### Changed

- **Issue #8 — index.css dead code removed:**
  - Deleted 5 unused files in `frontend/src/styles/`: `theme-tokens.css`
    (duplicate + syntax error), `animations.css`, `components.css`,
    `markdown.css`, `scrollbar.css` (all unimported)
  - Removed duplicate `@keyframes pulse-slow` definition (already in `@theme` block)
  - Removed `text-white/70`, `text-white/80`, `hover:text-white/70`,
    `hover:text-white/80` override rules (0 occurrences remaining after Issue #5)
  - Updated Issue #5 comment to reflect actual remaining count (118, not 937)
  - `index.css`: 459 lines → 430 lines

- **Issue #10 — Tailwind v4 confirmed:** `tailwindcss@4.3.2` and
  `@tailwindcss/postcss@4.3.2` installed and verified. Build passes in 12.52s
  with no CSS errors. No v3 legacy patterns (`@tailwind`, `theme()`) found.

### Not changed (analysis complete)

- **Issue #6 — Inline-styles audit (N/A):** All 39 remaining `style={{...}}`
  occurrences in 33 files are structurally required: 20x CSS custom properties,
  12x `getBoundingClientRect()` portal positioning, 6x ReactECharts API prop,
  1x dynamic upload progress bar. No action needed.

### In progress (Agent 2 on audit-report branch)

- **Issue #3 — systemSettings → SettingsManager:** ~135 call-sites being migrated
- **Issue #7 — Phase-3 validation tests:** SettingsManager test coverage
- **Issue #9 — TypeScript migration:** God-file typing

### Updated

- `CEO-AUDIT-REPORT-2026-07-08.md`: Grade upgraded from B+ (78) to A- (85/100)
- `ROADMAP.md`: Phase 11 added (audit-report sprint)
- `README.md`: Stack table and dependency hygiene updated
- `docs/DEPENDENCY-HEALTH.md`: @tremor/react, recharts-to-png, react-confetti-explosion confirmed dead/removed

## [Unreleased] — 2026-07-06 — PDF upload: NVIDIA NIM Vision OCR overhaul

### Changed — OCR engine: tesseract.js → NVIDIA NIM Vision (Nemotron 3 Nano Omni 30B)

- **CRITICAL — PDF OCR is now sub-second per page via NVIDIA NIM Vision
  API.** `collector/utils/OCRLoader/index.js` — replaced tesseract.js
  (and the briefly-tested PaddleOCR) as the primary OCR engine with
  NVIDIA's cloud-hosted Nemotron 3 Nano Omni 30B multimodal model.
  - Model: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`
  - API: OpenAI-compatible `/v1/chat/completions` at
    `integrate.api.nvidia.com`
  - Input: Base64-encoded PNG images of PDF pages
  - Output: Extracted text with layout/reading-order preservation
  - Native OCR, document intelligence, table/diagram understanding
  - No local model download, no CDN dependency, no worker bootstrap
  - `enable_thinking: false` for direct text extraction (no reasoning traces)
  - Parallel batch processing (default 4 concurrent requests)
  - New env vars: `NVIDIA_NIM_API_KEY`, `NVIDIA_NIM_MODEL`,
    `NVIDIA_NIM_BASE_URL`, `NVIDIA_NIM_TIMEOUT_MS`, `NVIDIA_NIM_MAX_TOKENS`,
    `NVIDIA_NIM_CONCURRENCY`
  - `OCR_ENGINE` default changed from `auto` to `nim`
  - Tesseract.js remains as automatic fallback if NIM API key is missing
    or API is unreachable
  - Removed `ppu-paddle-ocr` and `onnxruntime-node` dependencies (PaddleOCR
    approach replaced by NIM Vision)

## [Unreleased] — 2026-07-06 — PDF upload: state-of-the-art speed overhaul

### Changed — OCR engine: tesseract.js → PaddleOCR (PP-OCRv5)

- **CRITICAL — PDF uploads are now 10-50x faster for scanned/image-only
  PDFs.** `collector/utils/OCRLoader/index.js` — replaced tesseract.js as
  the primary OCR engine with `ppu-paddle-ocr` (PP-OCRv5 on ONNX Runtime).
  Benchmark: ~188ms/page (vs seconds/page with tesseract.js). Models are
  bundled locally — no CDN downloads, fully offline, no cold-start delay.
  - New `OCR_ENGINE` env var: `auto` (default, uses PaddleOCR if available,
    falls back to tesseract.js), `paddle` (force PaddleOCR), `tesseract`
    (force legacy).
  - New `OCR_PREWARM` env var (default `true`): pre-warms the OCR engine on
    collector startup to eliminate cold-start delay on the first upload.
  - Tesseract.js remains as a fallback for environments without ONNX
    Runtime. The existing `OCR_TESSDATA_PATH` / `OCR_CORE_PATH` env vars
    still work for offline tesseract deployments.
  - Added `ppu-paddle-ocr` and `onnxruntime-node` to collector dependencies.

### Changed — PDF text extraction parallelism

- `collector/processSingleFile/convert/asPDF/PDFLoader/index.js` —
  increased page extraction batch size from 8 to 16 for ~2x faster text
  layer extraction on multi-page PDFs.

### Changed — Frontend polling speed

- `frontend/.../DnDWrapper/index.tsx` — reduced poll interval from 1500ms
  to 300ms for near-instant feedback during PDF processing. Reduced
  max poll duration from 30min to 5min to match the new server timeout.

### Changed — Server timeout

- `server/utils/collectorApi/index.js` — reduced
  `COLLECTOR_PROCESS_TIMEOUT_MS` from 30 minutes to 5 minutes. With
  PaddleOCR at ~188ms/page, 5 minutes is enough for ~1500 OCR pages.
  Configurable via env for edge cases.

## [Unreleased] — 2026-07-06 — PDF chat upload: fix indefinite hang during OCR

### Fixed

- **CRITICAL — chat PDF uploads could hang for up to 30 minutes before
  erroring.** `collector/utils/OCRLoader/index.js` — scanned/image-only PDFs
  (any PDF where the digital text layer yields zero pages) fall back to
  OCR via `tesseract.js`. `createWorker()` — which can trigger a network
  fetch of the OCR engine core + language model on a cold cache — was
  called **before** this module's own `maxExecutionTime` timeout guard was
  even constructed, in all three OCR entry points (`ocrPDF`, `ocrImage`,
  `ocrImageBatch`). A blocked/slow network to the default tesseract.js CDN
  therefore hung indefinitely, with the only backstop being the much
  coarser upstream timeout chain (`COLLECTOR_PROCESS_TIMEOUT_MS` = 30 min
  server→collector, plus the frontend's 30-min `pollParseJob` cap) —
  from the user's perspective, attaching a scanned PDF in chat just
  "loaded forever" before an opaque failure appeared.
  - Added `createWorkerWithTimeout()`, a single choke point all three OCR
    entry points now go through. Worker bootstrap is bounded by the new
    `OCR_WORKER_BOOTSTRAP_TIMEOUT_MS` env var (default 60s) and fails fast
    with an actionable error message instead of hanging.
  - A worker that resolves after its bootstrap timeout has already fired
    is terminated immediately so it can't leak.
  - `ocrPDF`'s worker pool now times out each worker's bootstrap
    independently (via `Promise.allSettled`) and proceeds with whichever
    workers succeeded, same as before — just bounded now.
  - Added optional `OCR_TESSDATA_PATH` / `OCR_CORE_PATH` env vars so
    self-hosted/air-gapped ("sovereign") deployments can point OCR at a
    locally pre-downloaded tessdata + core bundle instead of depending on
    the public tesseract.js CDN at request time. Unset by default —
    behavior is unchanged (still uses the default CDN) unless configured.
  - New tests: `collector/__tests__/utils/OCRLoader/workerBootstrapTimeout.test.js`
    (5 tests covering fast-fail timing, actionable error message, env-based
    langPath/corePath forwarding, default-path preservation, and orphaned
    late-resolving worker cleanup).
  - Documented in `docker/.env.example`.

## [Unreleased] — 2026-06-29 — UI overhaul & chat polish

### Added

- **Empty State with 4 capability cards** — Quellen durchsuchen, Notizen
  machen, Politiker-Datenbank, KI mit Quellen. Vertically centered,
  `max-w-800px` container.
- **Grounding Badge component** — Sparkle icon, subtle styling
  (`text-[11px]`, `white/[0.04]` bg, `zinc-400` text).
- **Notizblock (Notepad)** — full CRUD: `workspace_notes` table via raw
  SQL migration, REST API endpoints, `NotepadSidebar` UI with auto-save,
  pin, and delete actions.
- **Auto-Summary Cards** — `document-snippets` endpoint, card redesign
  with snippet preview.
- **Code block copy button** — "Kopieren" label with language header.
- **3-pulse loading dots animation** — `w-2.5 h-2.5 bg-zinc-500` with
  200 ms delay spread between pulses.
- **Blockquote styling** — `border-left: 3px solid` + opacity.
- **Inline code styling** — background, padding, border-radius in both
  light and dark modes.

### Changed

- **Code blocks** — `bg-zinc-900 light:bg-slate-50`,
  `border border-white/5 light:border-slate-200`, `overflow-hidden`,
  8 px border-radius.
- **User messages** — `max-w-80%` right-aligned, `bg-zinc-700
  light:bg-slate-100`, `text-zinc-50 light:text-slate-800`,
  `rounded-br-sm`, `py-2.5`.
- **AI messages** — `max-w-85%` left-aligned, `py-2.5`, no bubble.
- **PromptInput** — `rounded-2xl` (was `rounded-t-lg`),
  `border-white/10` (was `theme-sidebar-border`), `shadow-sm` (was
  `shadow-lg`).
- **TextArea** — `pt-3.5` padding (was `pt-1.5`).
- **ChatHistory** — `pt-2 md:pt-3` (was `pt-4 md:pt-6`).
- **Scroll-to-bottom button** — `w-8 h-8` (was `w-9 h-9`),
  `shadow-md` (was `shadow-lg`), `bottom-[120px]` (was
  `bottom-[140px]`).
- **Left sidebar** — rebuilt ChatGPT-style: flat structure with
  `border-r`, no nested container, no tree lines.
- **Centered chat layout** — `max-w-[800px] mx-auto px-2 md:px-6` via
  Virtuoso `itemContent` wrapper.
- **Send button** — `slate-800` bg when text entered, `slate-400` when
  empty.
- **Agent `fireworksai.js` provider** — now uses
  `FIREWORKS_AI_LLM_BASE_PATH` env var + `FIREWORKS_AI_LLM_MODEL_PREF`
  + custom `User-Agent: OpenSIN-Chat/1.0`.

### Fixed

- **EmptyState now shows in all new chats** — `isEmpty` without
  `!threadSlug` guard (was only visible on workspace home).
- **Metrics default hidden** — `getAutoShowMetrics` returns `false`
  when `localStorage` unset (was always visible).
- **User message text invisible in dark mode** — `text-zinc-900` →
  `text-zinc-50` on user message spans.
- **Strong text invisible in light mode** — `text-white` →
  `text-white light:text-slate-900` in `markdown.ts` `strong_open`
  renderer.
- **TruncatableContent gradient mismatch** — gradient from
  `zinc-900` → `zinc-700` to match user bubble `bg-zinc-700`.
- **"Neuer Chat" button off-screen** — was at `y=1081px`, fixed with
  `sticky bottom-0 bg-zinc-950 light:bg-slate-100` wrapper.
- **Action buttons hover-only** — `md:opacity-0` →
  `md:group-hover:opacity-100` (was `md:h-0` making them unclickable).
- **Edit button on all user messages** — always renders, disabled when
  no `chatId`.
- **`pre code` background transparent** — `.markdown pre code {
  background: transparent; padding: 0; }`.

## [Unreleased]

### Fixed — Deep Bug-Scan (Waves 2-6)

Multi-wave systematic bug sweep across all layers of the codebase.
252 bugs fixed across 200+ files using parallel subagents.

- **Wave 2** (`f03a2346`) — 109 files, ~60+ bugs fixed across all layers
  (server, frontend, collector, docker, infra).
- **Wave 3** (`c81d139e`) — 39 bugs across server agents, AiProviders,
  frontend, and infrastructure.
- **Wave 4** (`c255e0ab`) — 26 bugs across agent plugins, models,
  frontend, and infrastructure.
- **Wave 5** (`a735444d`) — 24 bugs across aibitat core, helpers,
  frontend, and boot sequence.
- **Wave 6** (`3f283e63`) — 54 bugs across 51 files, executed by
  8 parallel subagents.

### Fixed — Bug sweep #3 (issue #254)

- **HIGH — Prisma `model_routers` / `model_router_rules` ambiguous
  relations.** `server/prisma/schema.prisma` — annotated both
  `createdByUser` relations explicitly with `@relation("RouterOwner")`
  and `@relation("RuleOwner")`, plus the matching back-references on
  `users`. `prisma format` + `prisma validate` + `prisma generate`
  all pass. **No DB migration required** — only the generated client
  typing changes.

#### Already landed in 48b929f8 (part of the same audit batch)

- **CRITICAL — resync handlers always returned HTTP 200.**
  `collector/extensions/resync/index.js` — all 6 handlers
  (`resyncLink`, `resyncYouTube`, `resyncConfluence`, `resyncGithub`,
  `resyncDrupalWiki`, `resyncPaperlessNgx`) now respond with
  **HTTP 502 + `{ success: false, content: null, error: "Resync failed", id: <uuid> }`**
  in their `catch` blocks instead of misleading HTTP 200.
  Frontend can now trust `response.ok`. Uses Node `crypto.randomUUID()`
  (Node ≥ 22, matching `engines.node`).
  Added `collector/__tests__/extensions/resync/index.additional.test.js`
  (12 new tests) asserting 502 + UUID envelope for all 6 handlers.
- **CRITICAL — `decodeURIComponent` outside try/catch.**
  `collector/processLink/convert/generic.js` — wrapped the
  `decodeURIComponent(url.pathname)` call so a malformed URI surrogate
  no longer crashes the link-saver; falls back to the raw path.
- **HIGH — manual redirect loop threw on malformed `Location`.**
  `collector/processLink/convert/generic.js` — wrapped the
  `new URL(...).toString()` call so a malformed absolute-relative
  Location header now aborts the redirect chain instead of bubbling
  a TypeError that killed the whole link-fetch.
- **HIGH — `AddSourceMenu` URL submit could leave loading state stuck.**
  `frontend/src/components/WorkspaceChat/ChatContainer/PromptInput/
  AttachItem/AddSourceMenu/index.tsx` — wrapped the post-`setSubmitting(true)`
  block in `try / catch / finally`, removed the redundant inline
  `setSubmitting(false)` calls. `submitting` is now guaranteed to
  flip back to `false` no matter what the upload throws.

### Added — Web push notification endpoints (web-push)

Closes the long-broken `/web-push/*` surface so the frontend
`useWebPushNotifications` hook (already shipped) and the Vitest
suites `tests/webPush.test.js` + `tests/notifications.test.js`
finally have a working backend.

- `server/utils/PushNotifications/index.js` — new
  `pushNotificationService` singleton. VAPID keys auto-generated
  via `web-push` (`generateVAPIDKeys()`) on first request and
  persisted to `server/storage/push-notifications/vapid-keys.json`
  (atomic temp+rename). Subscriptions persist as a JSON array at
  `server/storage/push-notifications/subscriptions.json`. The
  service registers/upserts/unsubscribes by `endpoint`, lists per
  user, and sends via `webpush.sendNotification` — automatically
  purging dead endpoints on HTTP 404/410.
- `server/endpoints/webPush.js` — registers five endpoints on the
  global `apiRouter`:
  - `GET  /web-push/pubkey`       → `{ publicKey }` (no auth)
  - `POST /web-push/subscribe`    → `201 { success, id }` (auth)
  - `POST /web-push/unsubscribe`  → `200 { success, removed }`
  - `GET  /web-push/subscriptions`→ `200 { subscriptions: [] }`
  - `POST /web-push/send`         → `200 { success, delivered, total }`
- `server/app.js` — wired `webPushEndpoints(apiRouter)` next to
  `providerStatusEndpoints` (immediately before `logBootDiagnostics`).
- `server/package.json` — added `web-push ^3.6.7` (MIT).

**Storage layout (gitignored under `storage/push-notifications/*`)**:
- `vapid-keys.json` — `{ publicKey, privateKey }`, generated once,
  reused across restarts.
- `subscriptions.json` — `{ subscriptions: [{ id, userId, endpoint,
  p256dh, auth, createdAt, updatedAt }, …] }`.

**Prisma migration is deferred.** The persistence layer is
intentionally a file store so this ships without a DB schema bump.
Migrating `subscriptions.json` → a `web_push_subscriptions` Prisma
model is left for a follow-up release that bundles the migration +
a back-fill script. The service interface is stable; only the
storage primitive will swap.

### Incident — 2026-06-17 — Cloudflare Error 1033 on sinchat.delqhi.com

A fresh-out outage surfaced a structural gap: `cloudflared` had died
on the OCI VM (`sin-blackbox` / `92.5.116.158`) with no external
monitor, so the silent network break was only noticed when the user
opened the URL. This release ships the recovery, the prevention, and
the runbook so this exact failure mode cannot recur.

### Added

- `scripts/cloudflared-watchdog/`: systemd unit + bash watchdog that
  keeps the Cloudflare tunnel alive on the OCI VM (`sinchat.delqhi.com`).
  Polls every 30 s, restarts cloudflared on failure, rate-limits to
  10 restarts per 10-min window. The watchdog itself is supervised by
  systemd via `Restart=always`/`RestartSec=10`. See
  `scripts/cloudflared-watchdog/README.md` for the one-time install
  command set.
- `scripts/oci-vm-bootstrap/`: end-to-end setup for the OCI VM.
  - `bootstrap.sh` — one-shot installer (transfer systemd units from
    this repo to `sin-blackbox`, install `cloudflared-watchdog` +
    `sinchat-healthcheck`, write `/etc/opensin/healthcheck.env`,
    restart `cloudflared`, verify the public URL is reachable).
  - `emergency-recover.sh` — 5-step recovery: VM reachable →
    `cloudflared` installed → systemd unit live → tunnel creds
    present → start + external verify (`HTTP 2xx/3xx`).
  - Both auto-detect `sin-blackbox` from `~/.ssh/config` and the
    latest tunnel JSON from `~/.cloudflared/`.
- `docs/INCIDENT-RESPONSE.md`: canonical runbook for "service is
  down, what now?". Maps Cloudflare error codes (1033/521/522/523)
  to root cause to concrete shell command. Names the exact SSH host,
  IP, keys, tunnel JSON path, Infisical project ID.
- 4 new global skills under `~/.config/opencode/skills/`:
  - `skill-oci-vm-ops` (general OCI VM operations runbook)
  - `skill-cloudflared-recovery` (narrower: tunnel-only)
  - `skill-incident-response` (universal Detect → Recover → Prevent)
  - `skill-infisical-secret-handling` (5 rules + 4 good channel
    patterns; the result of THIS incident's secondary lesson that
    a pasted Infisical token is leaked by definition).

### Changed

- `AGENTS.md` (global rule, `~/.config/opencode/AGENTS.md`):
  - priority 10 — NEVER paste tokens (`Infisical`/`GitHub`/`OpenAI`/…)
    in chat history, file contents, git commits, or `ps`-visible
    env. Channel via `chmod 600` temp file + stdin, OR use sin-infisical's
    file/stdin paths. Paste IS leak; rotate BEFORE usage.
  - priority 20 — agent sandboxes (`opencode`/`sin-code`) cannot SSH
    or run cloudflared/cloud-init. For sinchat ops ALWAYS use
    `scripts/oci-vm-bootstrap/` + `docs/INCIDENT-RESPONSE.md`. Hand
    the operator a single one-shot command instead of pretending.

### Removed

(none)

### Fixed

(none — incident-class change rather than bugfix)

### Verification

- Frontend `vitest`: **196 files / 1374 tests pass**
- Server `jest`:   **94 suites / 1536 tests pass**
- Frontend `yarn build`: success (~33 s)
- Shell checker `bash -n` on both new scripts: pass

### Operator action (next 5 minutes)

```bash
bash /Users/jeremy/dev/OpenSIN-Chat/scripts/oci-vm-bootstrap/emergency-recover.sh
```

— runs the 5-step recovery on `sin-blackbox` from the operator's
laptop; exits 0 when `curl https://sinchat.delqhi.com/` returns 2xx/3xx.

Then once back:

```bash
bash /Users/jeremy/dev/OpenSIN-Chat/scripts/oci-vm-bootstrap/bootstrap.sh
```

— installs the watchdog + healthcheck so you don't have to do this
again by hand.

## [3.18.0] — 2026-06-16 — Provider prune (wave-1..wave-6)

### Removed (16+ dead LLM/embedding/STT providers)

This release strips the legacy AnythingLLM provider surface to the
**18 active providers** currently shipped in the UI:

> OpenAI, Anthropic, Gemini, NVIDIA NIM, OpenCode Zen, HuggingFace,
> Ollama, LM Studio, Docker Model Runner, LocalAI, Fireworks AI,
> Mistral, Groq, LiteLLM, xAI, Generic OpenAI, Privatemode (UI kept,
> backend re-implementation deferred), Model Router.

Providers removed across wave-1..wave-6:

| # | Provider | Original dir / module | Killed in |
|---|---|---|---|
| 1 | MySQL DB layer | `server/utils/database/` (mysql subset) | wave-1+2 |
| 2 | MSSQL DB layer | `server/utils/database/` (mssql subset) | wave-1+2 |
| 3 | Apache Arrow | server-side embeddings | wave-3 |
| 4 | `truncate()` util | frontend (10 files migrated to `@/utils/strings`) | wave-3 |
| 5 | KoboldCPP       | LLM text-gen              | wave-5 |
| 6 | Azure OpenAI LLM | LLM (Azure **embedding** kept) | wave-5 |
| 7 | Together AI      | LLM text-gen              | wave-5 |
| — | moonshotai       | LLM text-gen              | wave-6 |
| — | cometapi         | LLM text-gen              | wave-6 |
| — | lemonade         | LLM + STT + embedding     | wave-6 |
| — | **minimax**      | LLM text-gen              | wave-6 |
| — | cerebras         | LLM text-gen              | wave-6 |
| — | zai (Z.AI)       | LLM text-gen              | wave-6 |
| — | dpais            | LLM (Dell Pro AI Studio)  | wave-6 |
| — | foundry          | LLM text-gen              | wave-6 |
| — | giteeai          | LLM text-gen              | wave-6 |
| — | apipie           | LLM text-gen              | wave-6 |
| — | bedrock          | LLM (AWS)                 | wave-6 |
| — | `openrouter`     | LLM text-gen              | wave-6 |
| — | `textgenwebui`   | LLM text-gen              | wave-6 |
| — | cohere           | LLM text-gen              | wave-6 |
| — | deepseek         | LLM text-gen              | wave-6 |
| — | ppio             | LLM text-gen              | wave-6 |
| — | novita           | LLM text-gen              | wave-6 |
| — | perplexity       | LLM text-gen (search skill kept) | wave-6 |
| — | sambanova        | LLM text-gen              | wave-6 |
| — | privatemode      | DELETED backend only — UI option still present, see Unreleased | wave-6 |

### Changed

- Frontend `LLMPREFERENCE` provider registry trimmed to the 18 active
  providers in two parallel files (`providers.tsx`, `llmProviders.tsx`)
  plus onboarding flow (`OnboardingFlow/Steps/LLMPreference/index.tsx`).
- `pages/WorkspaceSettings/AgentConfig/AgentLLMSelection/index.tsx`:
  `ENABLED_PROVIDERS` mirrors the same registry.
- `pages/GeneralSettings/EmbeddingPreference/index.tsx`: only
  OpenAI/Gemini/localai/ollama/lmstudio/voyageai/litellm/mistral/
  generic-openai/native remain.
- `pages/GeneralSettings/AudioPreference/stt.tsx`: only
  native/openai/deepgram/generic-openai remain.
- `pages/GeneralSettings/AudioPreference/tts.tsx`: only
  native/openai-compatible/elevenlabs/kokoro (ElevenLabs TTS kept —
  bare ElevenLabs LLM was removed).
- `components/ProviderPrivacy/constants.js`: privacy-map trimmed.
- `hooks/useProviderModels.ts`: `GROUPED_PROVIDERS` and
  `PROVIDER_DEFAULT_MODELS` pruned.
- `aibitat/providers/ai-provider.js` (`LangChainChatModel` switch)
  switched to the active provider set.
- `aibitat/index.js` (`getProviderForConfig` switch) mirrored.
- `endpoints/utils.js` (`getModelTag` switch) mirrored.
- `helpers/updateENV.js` `supportedLLM` list + dead env-validation
  blocks (TextGenWebUI, Privatemode, Lemonade STT) removed.
- `helpers/keyModelMap.js` `KEY_MAPPING` mirrored.
- `helpers/index.js` `getLLMProvider*` switches and
  `getBaseLLMProviderModel` switched + `azure` case removed (Azure
  embedding kept).
- `helpers/customModels.js`: orphan `getPrivatemodeModels` and
  dead-comment stubs for SambaNova/Cerebras removed.
- `boot/eagerLoadContextWindows.js`: foundry/cerebras cases removed.
- `AiProviders/modelMap/legacy.js`: cohere/deepseek/minimax/cerebras/
  giteeai removed.
- `models/systemSettings.js` `llmPreferenceKeys`: 23 dead provider
  env-var aliases removed (Privatemode, TextGenWebUI, Lemonade STT,
  MoonShot, Cohere, Bedrock, Novita, Foundry, …).
- `models/systemSettings.js`: STT-Lemonade keys removed.

### Fixed

- `pages/GeneralSettings/AudioPreference/stt.tsx` now derives required
  STT fields from the same source of truth as `SUPPORT_CUSTOM_MODELS`,
  no more drift.
- `helpers/customModels.js`: dead `getPrivatemodeModels` + SambaNova/
  Cerebras comment stubs removed.
- `helpers/chat/responses.js`: comments no longer suggest Cerebras-
  specific conform behaviour on providers that are gone forever.
- Pre-existing broken frontend tests re-fixed:
  - `components/Modals/NewWorkspace.test.jsx` — wrapped in `MemoryRouter`
  - `components/Sidebar/ActiveWorkspaces/ThreadContainer/ThreadFolderItem.test.jsx`
    — added `assignThread` mock + `waitFor(invalidateThreads)`

### Removed (files)

**Backend (server/)**
- `utils/AiProviders/textGenWebUI/index.js`
- `utils/AiProviders/lemonade/` (entire directory)
- `utils/SpeechToText/lemonade/index.js`
- `utils/SpeechToText/lemonade/`
- `utils/EmbeddingEngines/openRouter/index.js`
- `utils/agents/aibitat/providers/textgenwebui.js`
- `endpoints/utils/lemonadeUtilsEndpoints.js`
- `__tests__/utils/helpers/azureOpenAiModelPref.test.js`
  (Azure LLM provider was already removed in wave-5)

**Frontend (frontend/src/)**
- `components/LLMSelection/ApiPieOptions/`
- `components/LLMSelection/AwsBedrockLLMOptions/`
- `components/LLMSelection/CerebrasLLMOptions/`
- `components/LLMSelection/CohereAiOptions/`
- `components/LLMSelection/CometApiLLMOptions/`
- `components/LLMSelection/DPAISOptions/`
- `components/LLMSelection/DeepSeekOptions/`
- `components/LLMSelection/FoundryOptions/`
- `components/LLMSelection/GiteeAIOptions/`
- `components/LLMSelection/LemonadeOptions/`
- `components/LLMSelection/MinimaxOptions/`
- `components/LLMSelection/MoonshotAiOptions/`
- `components/LLMSelection/NovitaLLMOptions/`
- `components/LLMSelection/OpenRouterOptions/`
- `components/LLMSelection/PPIOLLMOptions/`
- `components/LLMSelection/PerplexityOptions/`
- `components/LLMSelection/PrivateModeOptions/`
- `components/LLMSelection/SambaNovaOptions/`
- `components/LLMSelection/TextGenWebUIOptions/`
- `components/LLMSelection/ZAiLLMOptions/`
- `components/EmbeddingSelection/CohereOptions/`
- `components/EmbeddingSelection/LemonadeOptions/`
- `components/EmbeddingSelection/OpenRouterOptions/`
- `components/SpeechToText/LemonadeOptions/`
- `media/llmprovider/`: 21 dead provider logos
- `models/utils/lemonadeUtils.ts`
- 20 dead translation blocks per locale file
  (`locales/en/common.js` −198 lines, `locales/de/common.js` −202 lines)

### Verification

- Frontend `vitest`: **196 files / 1374 tests pass**
- Server `jest`:   **94 suites / 1536 tests pass**
- Frontend `yarn build`: success (~33 s)
- Lint warnings/errors unchanged from baseline on unrelated files.

## [3.x.y] — earlier

See git history. This CHANGELOG focuses on the 2026-06 wave prune.

[3.18.0]: https://github.com/OpenSIN-AI/OpenSIN-Chat/compare/<prev>...eea11c94
[Unreleased]: https://github.com/OpenSIN-AI/OpenSIN-Chat/compare/3.18.0...HEAD

- `scripts/oci-vm-bootstrap/aura-call-emergency-recover.sh`: parallel
  recovery script for the second VM `92.5.30.252` (Aura-Call telephony).
  Operators run on their Mac — agent sandbox cannot SSH (AGENTS.md
  Priority 20). 7-step mirror of `emergency-recover.sh` covering
  `systemctl status aura-call`, restart, disk-guard, `/api/docs` probe.

### Skill integration — singleton source-of-truth for OCI / Cloudflare / sinchat / Aura-Call

The knowledge accumulated during the 2026-06-17 incident response —
canonical VM inventory, Cloudflare tunnel map, OCI-SDK profile, the
Service-Token zero-touch contract for Infisical, 7 pre-cooked recovery
playbooks — is now a published skill available to every agent:

| Where | What |
|---|---|
| `~/.config/opencode/skills/skill-oci-oracle-cloud/SKILL.md` (805 lines) | primary reference |
| `~/.config/opencode/skills/skill-oci-oracle-cloud/scripts/` | probe / push / decode / auto-loader shells |
| `Infra-SIN-OpenCode-Stack/skills/skill-oci-oracle-cloud/` (commit `101aae7`) | bundled + tracked source-of-truth |
| `Infra-SIN-OpenCode-Stack/skills/catalog.json` slot 2 | catalog entry |
| `Infra-SIN-OpenCode-Stack/opencode.json` | slash command `sin-cli-oci` |
| `~/.config/opencode/opencode.json` | baseline + slash command wired |
| `~/.config/opencode/AGENTS.md` §18 | global policy (Priority 11 Service-Token zero-touch) |
| `Infra-SIN-OpenCode-Stack/AGENTS.md` §19 | mirror copy + drift fix workflow |
| `OpenSIN-Code/AGENTS.md` | cross-reference block (commit `c334d38`) |
| sin-brain rule | priority 11 global |
| sin-memory entries | (1) 2026-06-17 incident + (2) Infisical contract |

29 OCI secrets all in `~/.infisical/secrets-backup/` (chmod-0600) +
mirrored to Infisical workspace `fa7758b4-f84c-4297-966e-710056d531ef`
env `production` via Service Token stored at `~/.infisical/agent-token`
(chmod-0600). Token auto-detected by every script — operator no longer
types tokens after the initial WebUI creation + pbpaste.
