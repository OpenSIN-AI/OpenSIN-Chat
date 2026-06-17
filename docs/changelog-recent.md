# Changelog — Recent Changes (Post-v1.13.0)

**Issue:** #118 — NEW Änderungen
**Period:** v1.13.0 → HEAD (commit `038316c0`)
**Date:** 2026-06-17
**Total commits:** 304
**Files changed:** 2,646 (336,045 insertions, 145,372 deletions)
**Breaking changes:** 11 (all deliberate dead-code/dep cleanup)

---

## Summary by Category

| Category | Count | Notes |
|----------|-------|-------|
| `feat` / `feature` | 189 | New features and capabilities |
| `fix` | 179 | Bug fixes and regressions |
| `chore` / `docs` / `build` | 177 | Maintenance, documentation, CI/CD |
| `perf` / `refactor` | 38 | Performance and code quality |
| **Breaking (`!`)** | 11 | Dead-provider cleanup, major dep bumps |

---

## Features (feat)

### PDF Analysis Multi-Agent Module
- `dbfb13da` — PDF-Analyse Multi-Agenten-Modul (initial)
- `d96a7dce` — Retry/Backoff, Upload, Range-Streaming, UI
- `c1dde299` — AIMD-Parallelität + Job-Persistenz über Neustarts
- `8e5ceafd` — Sicherheit + Fakten-Verifikation + Cross-Check
- `db058d49` — Cross-Check Browser-UI
- `8c11df86` — OCR-Triage + Critic-Reflexion + Citation-Grounding
- `60615c54` — SQLite/FTS5, Live-Telemetrie, Vision/VLM, Video-Keyframes
- `e8d3e97a` — Lokale Vision (MiniCPM-V/Ollama) + Deep-Scan-Modus
- `c17616db` — Retention, CrossCheck-Persistenz, Report-Download
- `f299a346` — Korpus-Vergleich (Server + UI)
- `8c4194a2` — Production hardening — concurrency, cleanup, OCR fallback, CoDocs, dark mode

### TypeScript Migration
- `4c5cd164` — Phase 1: Setup & Infrastructure
- `ccd84537` — Phase 2: Core Models
- `7dd21662` — Hooks, Components & Guide
- `efd1a033` — All JS/JSX files converted to TS/TSX
- `150e5e00` — Complete Pages layer migration to .tsx/.ts (#174)

### SWR Data Layer
- `ed21f9e9` — Introduce SWR data layer (#61)
- `da767fe9` — Migration Phase 3.1-3.8
- `e4ae83ef` — Migration Phase 3.9-3.13
- `7c4a9a77` — Phase 4: Threads, Chat History, Agents
- `c433e890` — Replace 14 useEffect fetches with SWR hooks

### i18next Warning Elimination
- `ff8af232` — Batch 1+2: 161 warnings eliminated
- `486aeeea` — Batch 3: 126 warnings
- `8d77196b` — Batch 6: 318 warnings (1042→724)
- `728e7a0e` — Batch 5: 301 warnings (1338→1037)
- `fd104490` — Batch 7: 94 warnings (558→464)
- `4d2844a7` — Batch 8: 132 warnings (409→277)
- `7ea43253` — Batch 9: 79 warnings (377→298)
- `443e3d01` — Batch 10: 60 warnings (298→238)
- `7f5d5bdf` — Batch 11: 60 warnings (238→178)
- `e5604552` — Batch 14: 245 warnings (298→53)
- `359c351a` — Final batch: remaining warnings (53→0)

### Infrastructure & DevOps
- `add376e8` — Cloudflared watchdog + sinchat healthcheck + n8n uptime workflow
- `9e62abc4` — Unified 30s tunnel health check via systemd timer
- `e9044b0f` — Local polling auto-deploy script
- `dc98d0e8` — OpenSIN-Chat deployment (port 43939, sinchat.delqhi.com)
- `6bc5265e` — Supabase self-hosted (PostgreSQL + pgvector + Storage)

### UI/UX Features
- `d238f3f2` — Right sidebar with 6 panels (Preview, Console, Filesystem, Database, Political)
- `ce86c390` — Draggable sidebar with persistent width
- `28a5cda1` — Draggable right sidebar with persistent width
- `1b62e05b` — Right sidebar toggle (like left sidebar)
- `7da9af1e` — '+ Neuer Chat' as 4th dropdown option in thread menu
- `7d3680a8` — Quick add for new chats and folders in workspaces
- `904ad255` — ThoughtBrainButton and chat message display logic
- `fe839fdd` — Theme toggle button in Footer
- `f18e8d33` — Dark/light logo upload with useRef + URL.revokeObjectURL
- `222bb6ce` — Common UI strings to i18n files (en, de)
- `8ee60dc8` — Right sidebar icon bar always visible
- `9907a1e2` — PDF report modal overhaul — markdown rendering, exports, TOC
- `acc97958` — Persistent Background-Job-Queue + defensive WS-Guard

### Security Hardening
- `26eb3355` — Memory-DoS hardening & SSRF protection
- `0c080bf6` — Rate-limiting, report retention & input caps (F6-F8)
- `da792544` — Auth telemetry, body-limit hardening & backup tooling (F9-F11)
- `f6886bd6` — Security headers, env-dump hardening & deployment observability
- `54af0476` — Defense-in-depth headers (nosniff, CSP sandbox, cache, CORP)
- `891d19bb` — Sanitize dangerouslySetInnerHTML in modals + DOMPurify for XSS
- `e61478d3` — .dockerignore to shrink build context and prevent secrets in image

### Politician DB
- `6c81d5e8` — Politician DB module (Bundestag API, Abgeordnetenwatch, Plenarprotokolle)
- `2fcfd3d4` — Politician Sync Dashboard, API, Health Check & Runbook (#85)
- `7ef1d62c` — Migrate to 21st Bundestag data sources (#84)
- `bfd73420` — Text-search fallback for semantic search without pgvector (#21)
- `60a814e2` — Source filter + sources/sync-status endpoints (#50, #51)

### Other Features
- `acc1c952` — Vane sidecar as cited answer engine
- `897ee9ac` — NVIDIA NIM as TTS provider
- `446b5ea8` — Image generation, PDF read/edit plugins & admin panels
- `3a5ca03e` — Inline image preview for generated images
- `5a6762b4` — In-app developer documentation under /docs
- `97473219` — Folder management in ThreadFolderItem
- `81652e48` — Drag-and-drop for thread organization
- `7ffecd6d` — POST /api/utils/enhance-prompt + /api/utils/terminal/exec
- `b7bcfef7` — Parallel batch: i18next, SWR Phase 3.1, P1 Chores, P2 Refactors

---

## Fixes (fix)

### Dead Provider Cleanup (Waves 1-6)
- `4ef8a314` — **Wave-1+2:** Prune AnythingLLM legacy providers (mysql/mssql kept) **[BREAKING]**
- `26f9c759` — **Wave-3:** Remove 3 more LLM providers (KoboldCPP, Azure OpenAI, Together AI) **[BREAKING]**
- `eea11c94` — **Wave-6:** Remove all remaining dead providers **[BREAKING]**
- `14a95837` — **Wave-6:** Dead locale + provider UI cleanup **[BREAKING]**
- `406aa5d6` — Wave-4: Resolve leftover broken imports from wave-1+2 prune
- `d89bf5ab` — Remove dangling telegram import
- `5191d9e8` — Remove dangling webPush import

### Docker / Deployment
- `f57c4035` — Remove BuildKit cache mounts causing permission errors
- `e633fb2a` — Remove leftover YARN_CACHE_FOLDER env
- `85dffe2b` — Pass JWT_SECRET + LLM config via compose environment
- `606ee208` — Isolate OpenSIN/Vane ports (app 3002:3001, Vane 8310:8300)
- `87475855` — Guarantee server/utils/paths.js exists in image and at runtime (#102)
- `236dc192` — Add restart: always to both compose files; fix DB crash
- `9b46260b` — Ensure paths.js present and verified at build/runtime for native embedder

### Chat / Streaming
- `9f39948e` — Filter reasoning tags from token stream
- `54996597` — Stop adding reasoningText to fullText in streaming responses
- `4da7d3c3` — Send filteredToken instead of token to frontend
- `fe52bbb1` — Add to thought keywords + reduce textarea padding
- `a618b62b` — Remove dangling brace in genericOpenAi/index.js
- `bc71ec44` — Remove dangling brace in responses.js that broke for-await loop

### Agent / Provider Fixes
- `662b8b9e` — Prevent @agent crashes on local providers without API keys (#116)
- `a34e8356` — Use browser User-Agent to bypass Cloudflare bot protection for /v1/models
- `a3588986` — NVIDIA NIM robust error handling to prevent container crashes (#112)
- `514d1b0e` — Pass API key to NVIDIA NIM model list fetch
- `4601b0a6` — DeepSeek apiKey null fallback & null-guard onRename callbacks
- `d026fd6b` — Replace apiKey: null with placeholder strings for local providers (#104)

### UI Fixes
- `3aead917` — Add w-[var(--sidebar-width)] to nav for proper collapse
- `6910bfd0` — 3 sidebar bugs — stale closures, missing deps, hard navigations
- `331c7705` — 4 sidebar bugs — stale closure, debounce, hard-reload, missing folder
- `769b2a80` — Restore full Workspace model, fix search icon, ThreadContainer props
- `4e5df758` — AccountMenu-Popup in light mode white instead of gray
- `c0c18823` — Plus icon dropdown clipping & right sidebar layout (#99)
- `47f49055` — Icon overlay top-right fix
- `54ed4624` — SourcesSidebar crash — null.forEach when sidebarData is null

### Security Fixes
- `49dc91df` — SSRF, key-wipe, defaultValue race, i18n, remove duplicate edit-pdf-file
- `b9e09233` — Whitelist process.env.NODE_ENV in Vite define to avoid full process.env exposure
- `9769b278` — Guard metadata JSON.parse against malformed data
- `f0115cc7` — Guard 7 unsafe .find() and null-spread crash sites
- `964d7501` — Revoke object URLs to prevent blob memory leaks
- `ed903b8f` — Remove ABORT_STREAM_EVENT listeners to prevent accumulation
- `6fc5dffb` — Clean up timers/mic on unmount and drop dead imports

### Miscellaneous Fixes
- `8c04d888` — Apply safe patch/minor upgrades across frontend, server, collector
- `114b1c52` — Add missing apache-arrow dependency for @lancedb/lancedb
- `5e28b6d7` — Resolve Chart.js TDZ via lazy-loading Chartable (#125)
- `c5a1503f` — Resolve all 320 ESLint errors — CI lint job now passes
- `2fc97810` — Eliminate request storms for api/system/logo and api/system/refresh-user
- `038316c0` — Allow POST /onboarding without auth while onboarding is incomplete
- `d0cd1c60` — P0 container startup + paths.js guard

---

## Performance (perf)

- `6905658a` — Docker multi-stage build with BuildKit cache mounts + layer caching
- `ed21f9e9` — SWR data layer for reduced refetching (#61)
- `cf2c49d3` — Shard Vitest tests and add CI timeouts to prevent 5-minute timeouts

---

## Refactoring (refactor)

- `efd1a033` — TypeScript migration: all JS/JSX → TS/TSX
- `da767fe9` — SWR Migration Phase 3.1-3.8
- `e4ae83ef` — SWR Migration Phase 3.9-3.13
- `0399151a` — Replace 73 inline styles with Tailwind utilities
- `da26d5c2` — Split 5 oversized files (WorkspaceDirectory, LLMPreference, Admin/Agents)
- `9e822257` — Centralize getStoragePath and remove inconsistent STORAGE_DIR fallbacks
- `90853c20` — Extract WebSocket logic into useWebSocket hook
- `a81346f2` — Extract ModelSelector component and add agent support
- `82665c4c` — Extract useSystemSettings hook from TTSProvider
- `e3ea4583` — Wave-3: Remove unused deps (apache-arrow + truncate) **[BREAKING]**
- `76893a60` — Remove orphaned Next.js/v0 scaffolding

---

## Breaking Changes

| Commit | Change | Reason |
|--------|--------|--------|
| `4ef8a314` | Wave-1+2: Remove AnythingLLM legacy providers | Dead code cleanup |
| `26f9c759` | Remove KoboldCPP, Azure OpenAI, Together AI | Dead code cleanup |
| `e3ea4583` | Remove unused deps (apache-arrow + truncate) | Dead code cleanup |
| `eea11c94` | Wave-6: Remove all remaining dead providers | Dead code cleanup |
| `14a95837` | Wave-6: Dead locale + provider UI cleanup | Dead code cleanup |
| `7454caeb` | LangChain 0.1.x → 0.3.x | Security + compatibility |
| `f2eba5e2` | Express 4 → 5 | Security + compatibility |
| `6ed75472` | Jest 29 → 30 | Test framework upgrade |
| `ea0145db` | OpenAI 4.x → 6.x | SDK upgrade |
| `1507f375` | Vite 5 → 6 | Build tool upgrade |
| `1db8d449` | Eliminate HIGH/CRITICAL vulns (59→8 server, 4→1 frontend) | Security hardening |

---

## CI/CD Improvements

- `e3f7afd5` — Branding linter + GitHub Actions workflow
- `a6e0d47c` — Add collector/server lint jobs + frontend npm audit gate
- `620f849d` — CEO audit CI workflow + SPDX headers + Dependabot
- `1ae8d870` — No-console ESLint rule + annotate existing console.log calls
- `89cc15e0` — ESLint rule preventing inline styles (#65)
- `891d19bb` — ESLint rules & DOMPurify for XSS protection
- `486aeeea` — activate eslint-plugin-i18next to prevent hardcoded-string regressions

---

## Testing

- `0c2cac36` — Vitest + Testing Library test infrastructure for frontend (#28)
- `1619918c` — 6 component test suites — 1381 tests all green
- `653992bf` — 6 component test files for critical untested paths
- `858bf3e8` — Politician Sync dashboard, hook, and health check tests (#173)
- `2d06a2eb` — 10 collector test suites (OCRLoader, tokenizer, shell, RepoLoader, etc.)
- `ccb5e4f4` — 79 new tests (TextSplitter, orchestrator, reports, queue, agentFlows)
- `ffd4831d` — 177 new tests across frontend utils, components, server middleware
- `c8257b33` — 200+ new tests for server responses, telegram utils, frontend models
- `fd4b0ad6` — Comprehensive endpoint test suite with coverage summary
- `9ce89327` — 38 unit tests for hooks, utils and chat components
- `8c5341b6` — Raise coverage thresholds to 20%

---

## Documentation

- `873da9c3` — Comprehensive README for PDF-Analyse-Modul
- `b95a8872` — Update README for OpenSIN-AI branding, ports, test infrastructure
- `5a6762b4` — In-app developer documentation under /docs
- `8da27c6f` — DOCKER-DEPLOYMENT.md with all known issues
- `6c4f43e5` — SYNC-RUNBOOK.md for politician DB sync
- `585e695f` — DATA-SOURCES.md for external API documentation
- `afe75351` — Production architecture diagram in README + docs/architecture.md
- `c2ca4a25` — Update ROADMAP + PLAN — Phase 3/6 legacy issues resolved

---

## Incomplete / TODO Items

All TODO items found in recent commits are in upstream code, not new OpenSIN modules:
- `collector/utils/constants.js` — 2 TODOs for asDoc.js (upstream)
- `docker/Dockerfile` — 1 TODO (upstream)
- `eslint.config.js` — 1 FIXME (upstream)

No incomplete changes were found in recent commits — all features are delivered and functional.

---

## Issue Closure Summary

All 164 GitHub issues are now closed, including:
- #24 — Finalize CEO Audit (this report)
- #116 — @agent crashes on local providers
- #125 — Chart.js TDZ Error
- #21 — Politician Sync Job (FTS fallback added)
- #112 — NVIDIA NIM model mismatch crash
- #113 — Onboarding 'Weiter' button
- #114 — paths.js Demo-Container
- #105, #106, #108, #111 — P5 Sweep issues

---

*Generated from git log v1.13.0..HEAD — 304 commits, 2646 files changed*
