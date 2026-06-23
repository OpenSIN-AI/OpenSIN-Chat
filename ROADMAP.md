# OpenSIN Chat — ROADMAP (GSD-Style)

> **GSD-Phasen:** Get Shit Done — jede Phase ist ein abgeschlossenes Deliverable.  
> **Aktueller Stand:** Phase 1 ✅, Phase 2 ✅, Phase 3 ❌ CANCELLED, Phase 4 ✅, Phase 5 ✅, Phase 6 ✅, Phase 7 ✅ COMPLETE (Docs Overhaul), Phase 8 ✅ COMPLETE (Docs UI Polish), Phase 9 ✅ COMPLETE (Security & Operations Hardening), Phase 10 ✅ COMPLETE (Production Readiness — All Epics Done)  
> **Repo:** [OpenSIN-AI/OpenSIN-Chat](https://github.com/OpenSIN-AI/OpenSIN-Chat)  
> **Letztes Update:** 2026-06-23  
> **Aktueller PLAN:** [docs/PLAN-PRODUCTION-READINESS.md](docs/PLAN-PRODUCTION-READINESS.md) — Phase 10: Production Readiness ✅ COMPLETE

---

## Phase 1: Foundation & Core Re-Fork ✅ **COMPLETE**

> **Zeitraum:** Mai 2025 – Juni 2026  
> **Ziel:** OpenSIN-Chat als produktionsreifes, eigenständiges Fork-Produkt etablieren.  
> **CEO Audit Grade:** A (94.5/100 — final audit 2026-06-17, see `docs/ceo-audit-final.md`)

### Deliverables

| # | Feature | Status | Commit / Issue |
|---|---|---------|--------|---------------|
| 1.1 | Re-Fork Option A (Squash-Patch-Serie) | ✅ | PRs merged, `6c727830` |
| 1.2 | Branding Shims (Logo, Wordmark, AfD-Blau) | ✅ | `85938bd0` |
| 1.3 | Branding-Linter + CI Workflow | ✅ | `e3f7afd5` + GH Actions |
| 1.4 | Wordmark SVG (16:6, AfD-Logo embedded) | ✅ | `9be9ae7f` |
| 1.5 | `@openafd/*` → `@mintplex-labs/*` Revert | ✅ | Part of server smoke test |
| 1.6 | Node.js ≥18 SlowBuffer Shim | ✅ | `33e969a` + `ee0bdafe` |
| 1.7 | JWT_SECRET Auto-Generation | ✅ | `81707ce5` |
| 1.8 | Single-User Mode (Session-Token Auto-Grant) | ✅ | `0aff17c9` |
| 1.9 | `.env` Gitignore + Secret-Management | ✅ | `7d91c70b` |
| 1.10 | CEO Audit (47 Gates, 0 CRITICAL, 0 HIGH) | ✅ | `620f849d` + `ceo-audits/2026-06-06-ceo-audit.md` |
| 1.11 | GitHub Actions CI (Dependabot, CEO Audit) | ✅ | `.github/workflows/ceo-audit.yml`, `.github/dependabot.yml` |
| 1.12 | SPDX Headers (21 neue Module) | ✅ | `620f849d` |
| 1.13 | CoDocs Standard (0 broken refs) | ✅ | `research/index.doc.md` + alle `.doc.md` |
| 1.14 | Storage Dir Fallback (STORAGE_DIR crash) | ✅ | 7 Dateien gepatched |
| 1.15 | Prettier Auto-Fix | ✅ | `b6579887` |

### Phase 1 Closure
- **Code:** Production-ready, kompiliert, startet sauber  
- **Docs:** CEO Audit A, CoDocs vollständig, CI läuft  
- **Security:** Keine Secrets in Git, JWT_SECRET auto-generiert  

---

## Phase 2: Core Features & Integration ✅ **COMPLETE (100%)**

> **Zeitraum:** Juni 2026  
> **Ziel:** Alle neuen OpenSIN-Features in die Codebase integrieren, AI-Providers verbinden, UI/UX polieren.  
> **Blocker:** Browser-Cache (User), Vercel Pool Credits, Politician DB leer

### 2A: AI Provider Integration ✅

| # | Feature | Status | Commit / Issue |
|---|---|---------|--------|---------------|
| 2.1 | NVIDIA NIM Cloud API | ✅ | `1bd39360` – Nemotron 3 Ultra 550B (1M Context) |
| 2.2 | NVIDIA NIM API Key Support | ✅ | `NVIDIA_NIM_LLM_API_KEY` in `.env` |
| 2.3 | OpenCode Zen Provider | ✅ | `7da82a36` – OpenAI-kompatibel |
| 2.4 | OpenCode Zen Base Path Fix (`/zen/v1`) | ✅ | `fed54ac8` |
| 2.5 | OpenCode Zen Custom Models (Workspace) | ✅ | `8ac62a24` – Live API-Fetch + 10 Fallbacks |
| 2.6 | OpenCode Zen Agent Provider (AIbitat) | ✅ | `3690f5ed` – `OpencodeZenProvider.js` |
| 2.7 | OpenCode Zen Frontend (Logo, Options, Privacy) | ✅ | `7da82a36` + `8ac62a24` |
| 2.8 | OpenCode Zen Model Picker (Workspace) | ✅ | `8ac62a24` |
| 2.9 | Cache-Control Headers (HTML no-cache) | ✅ | `8593bcf1` – MetaGenerator fix |
| 2.10 | Vite Entry Chunk Cache (60s) | ✅ | `server/index.js` static middleware |

### 2B: Politician Database Module ✅

| # | Feature | Status | Commit / Issue |
|---|---|---------|--------|---------------|
| 2.11 | PoliticianDB (Bundestag API, Abgeordnetenwatch) | ✅ | `6c81d5e8` |
| 2.12 | Plenarprotokoll Scraper | ✅ | `6c81d5e8` |
| 2.13 | REST API (`/api/politician/*`) | ✅ | `6c81d5e8` |
| 2.14 | Agent Plugin (`@politician-search`) | ✅ | `6c81d5e8` |
| 2.15 | Bree Sync Job (`sync-politician-data.js`) | ✅ | `6c81d5e8` |
| 2.16 | SQLite Fallback (kein pgvector) | ✅ | `semanticSearchSpeeches` gibt `[]` zurück |
| 2.17 | PoliticianVectorStore (pgvector ready) | ✅ | FTS text-search fallback for SQLite (no pgvector needed) |

> **Blocker:** Sync-Job configured (Bree 6h interval) + manual trigger via API. DB population is operational — run sync or trigger via `/politician/sync/trigger`.

### 2C: Deep Research Pipeline ✅

| # | Feature | Status | Commit / Issue |
|---|---|---------|--------|---------------|
| 2.18 | Research Orchestrator (`/api/research`) | ✅ | `89f4d4b9` |
| 2.19 | Web Search Engine (SerpAPI + DuckDuckGo) | ✅ | `89f4d4b9` |
| 2.20 | Content Extractor (HTML → Text, 15s Timeout) | ✅ | `89f4d4b9` |
| 2.21 | Summarizer (LLM + Fallback) | ✅ | `89f4d4b9` |
| 2.22 | Research Agent Plugin (`@deep-research`) | ✅ | `89f4d4b9` |

### 2D: PDF Report Generator ✅

| # | Feature | Status | Commit / Issue |
|---|---|---------|--------|---------------|
| 2.23 | PDF Generator (`/api/reports`) | ✅ | `89f4d4b9` – mdpdf + pdf-lib |
| 2.24 | AfD Branding (Cover, Header, Footer) | ✅ | `89f4d4b9` – StandardFonts.Helvetica |
| 2.25 | Report Agent Plugin (`@generate-report`) | ✅ | `89f4d4b9` |

### 2E: Unified Agent Orchestrator ✅

| # | Feature | Status | Commit / Issue |
|---|---|---------|--------|---------------|
| 2.26 | Orchestrator (`/api/orchestrator`) | ✅ | `89f4d4b9` – Goal → Steps Auto-Inference |
| 2.27 | Orchestrator Agent Plugin (`@orchestrator`) | ✅ | `89f4d4b9` |
| 2.28 | Plugin Registry (alle 3 neuen Plugins) | ✅ | `89f4d4b9` – `plugins/index.js` |

### 2F: UI/UX Polishing ✅

| # | Feature | Status | Commit / Issue |
|---|---|---------|--------|---------------|
| 2.29 | SidebarTabs (Quellen ↔ Erinnerungen) | ✅ | `b36e0144` |
| 2.30 | SourcesSidebar (Chat-Zitate + Workspace-Fallback) | ✅ | `8ac62a24` – mit `MemoriesProvider` fix |
| 2.31 | SourceFilter (Alle/Dokumente/Medien) | ✅ | `8ac62a24` + Translations |
| 2.32 | ChatSettingsMenu (SourcesRow + SourceFilterRow) | ✅ | `8ac62a24` |
| 2.33 | MemoriesSidebar Syntax Fix (`>` → `);`) | ✅ | `620f849d` |
| 2.34 | Piper-TTS Import Fix (`@openafd` → `@mintplex-labs`) | ✅ | `620f849d` |
| 2.35 | Translations (de + en) | ✅ | `source_filter_*`, `workspace_sources` etc. |
| 2.35a | Translations (es, fr, it, pt_BR, zh, zh_TW, ja, ko) | ✅ | i18n-Nachpflege: `workspaceSources.*`, `attach_menu.*` |
| 2.36 | Frontend Build & Deploy (83 Assets) | ✅ | `8593bcf1` + `8ac62a24` |
| 2.37 | OpenCode Zen in Provider Picker | ✅ | Backend ✅; Browser-Cache war User-seitig — Cache-Control Header setzen + vendor-charts löschen hat das gelöst |
| 2.38 | Document Processor 503 | ✅ | Won't-fix — Python-Collector-Service ist erwartungsgemäß offline im Single-User-Modus; kein Bug |
| 2.39 | Logo 204 (No Custom Logo) | ✅ | Won't-fix — harmlos, kein Custom Logo hochgeladen; Default-Asset verhält sich korrekt |

### 2G: Multi-Agent PDF Analysis Module ✅

| # | Feature | Status | Commit / Issue |
|---|---|---------|--------|---------------|
| 2.40 | PDF Analysis Architektur (Agents, Pipeline, UI) | ✅ | `server/utils/pdfAnalysis/` (18 Server-Module) |
| 2.41 | Range-basiertes PDF-Streaming (Seite 1–1000) | ✅ | `pdfReader.js` – Konfigurierbare Step-Größe |
| 2.42 | OCR (tesseract.js, Deutsch + Englisch) | ✅ | `ocr.js` – Fallback-Kaskade |
| 2.43 | Vision Agent (MiniCPM-V Ollama + Cloud) | ✅ | `visionAgent.js` + `localVision.js` – `auto\|ollama\|cloud` |
| 2.44 | Deep Scan Extraktion | ✅ | `deepScan.js` – Tabellen, Metadaten, Struktur |
| 2.45 | AIMD Adaptive Parallelität | ✅ | `agentPool.js` – Congestion-Avoidance |
| 2.46 | Deterministische Fact-Verifikation | ✅ | `factVerifier.js` – Substring-Quote-Match ±1 Seite |
| 2.47 | Cross-Check (URL/PDF/YouTube/Suche) | ✅ | `crossCheck/` – Serper + SearchApi Deep-Web |
| 2.48 | Corpus Comparison (Multi-PDF Konsens/Konflikt) | ✅ | `corpus/comparator.js` + `corpus/index.js` |
| 2.49 | SQLite+FTS5 Fakt-Store (Millionen-Fakten) | ✅ | `factStore.js` – Auto-Migration von facts.json |
| 2.50 | 2-Stage Critic Agent (Reflexion + Repair) | ✅ | `criticAgent.js` – Selbstkorrektur |
| 2.51 | Citation Grounding + Source Linking | ✅ | `synthesizer.js` – Seitenzahlen, URLs |
| 2.52 | Retention & Cleanup Scheduler | ✅ | `retention.js` – Alter/Size-basiert |
| 2.53 | Security (Rate-Limit, Auth, Path-Traversal) | ✅ | `security.js` – Multi-Layer |
| 2.54 | Live Telemetry / ETA | ✅ | `jobStore.js` – SSE-Rückkanal |
| 2.55 | Browser-UI (4 Tabs: Analysen, Fakten, Cross-Check, Korpus) | ✅ | `frontend/src/pages/PdfAnalysis/` |
| 2.56 | Report Download (`.md`) | ✅ | PDF → Markdown Export |
| 2.57 | Agent Plugin (`@pdf-analyze`) | ✅ | `server/utils/agents/aibitat/plugins/pdf-analyze.js` |
| 2.58 | REST API (`/api/pdfAnalysis/*`) | ✅ | `server/endpoints/api/pdfAnalysis/index.js` |
| 2.59 | Config-ENVs (19 Parameter) | ✅ | `config.js` + `.env.example` |

### 2H: Infrastructure & Bugfixes ✅

| # | Feature | Status | Commit / Issue |
|---|---|---------|--------|---------------|
| 2.60 | Cloudflare Tunnel Health-Check (beide Tunnels) | ✅ | `tunnel-health-check.sh` + cron 30s |
| 2.61 | ESLint 320→0 Errors (Flat Config) | ✅ | Commit `c5a1503f` |
| 2.62 | i18next Warnings 1976→1859 (−6%) | ✅ | 5 Top-Files gefixt, ~230 Keys hinzugefügt |
| 2.63 | Chart.js TDZ Fix (React.lazy + Suspense) | ✅ | Commit `5e28b6d7` |
| 2.64 | Cache-Control Header (no-cache, no-store) | ✅ | MetaGenerator + Express Middleware |
| 2.65 | Container Deploy (docker cp + root cleanup) | ✅ | Hot-Deploy ohne Rebuild |

### 2I: Workspace & UI Features ✅

| # | Feature | Status | Commit / Issue |
|---|---|---------|--------|---------------|
| 2.66 | SidebarTabs (Sources ↔ Memories) | ✅ | `b36e0144` |
| 2.67 | SourcesSidebar mit Workspace-Fallback | ✅ | `8ac62a24` |
| 2.68 | SourceFilter (All/Documents/Media) | ✅ | `8ac62a24` |
| 2.69 | ChatSettingsMenu + SourcesRow | ✅ | `8ac62a24` |
| 2.70 | MemoriesSidebar Syntax Fix | ✅ | `620f849d` |

### Phase 2 Blocker (gelöst)

| Blocker | Status | Resolution |
|---------|--------|------------|
| **User Browser Cache** | ✅ | Cache-Control Header gesetzt + alte vendor-charts gelöscht |
| **Politician DB leer** | ✅ | Sync-Job ausgeführt (`804b6388`): 733 Politiker, 7382 Reden in der DB |
| **npm audit** | 🟡 | Server: 5 vulns (hono via @modelcontextprotocol/sdk — transitive, nicht direkt fixbar). Collector: 0 (officeparser 4→7 Upgrade fixt file-type ASF vuln). Frontend: 0. |
| **AIbitat `opencode-zen` Case** | ✅ | Gefixt in `3690f5ed` |

---

## Phase 3: i18next Elimination & Code Quality ❌ **CANCELLED (by user)**

> **Siehe [PLAN.md](PLAN.md) Priorität 1**  
> **Status:** User hat entschieden, i18next-Warnings zu ignorieren (Issue #121 cancelled). Warnings sind noise-only und blockieren keine Funktionalität.

---

## Phase 4: PDF Analysis Hardening ✅ **COMPLETE**

> **Siehe [PLAN.md](PLAN.md) Priorität 2**  
> **Status:** Production hardening implementiert — Commit `8c4194a2` (Concurrency-Tuning, Memory-Limits, Job-Timeout, CoDocs, OCR-Fallback, Dark Mode).

---

## Phase 5: Build Cleanup & Infrastruktur ✅ **COMPLETE**

> **Siehe [PLAN.md](PLAN.md) Prioritäten 3+4**  
> **Status:** Build cleanup durchgeführt (Commit-Reihe 2026-06-17), Tunnel Health-Check via systemd aktiv (Commit `9e62abc4`, 30s Interval).

---

## Phase 6: Legacy Issues abarbeiten ✅ **COMPLETE**

> **Siehe [PLAN.md](PLAN.md) Priorität 5**  
> **Status:** Alle P0–P3 Issues abgearbeitet (#105–#119). Issue #121 (i18next) vom User cancelled. Issue #22 (Unit Tests) partial — 650+ Tests existieren, weiterer Ausbau durch separaten Subagent.

---

## Phase 7: Documentation Overhaul ✅ **COMPLETE**

> **Zeitraum:** Juni 2026  
> **Ziel:** Alle Dokumentationen unter sinchat.delqhi.com/docs und die README.md an den aktuellen Code-Stand anpassen. Visuell ansprechende README nach SOTA-Standard.  
> **Auslöser:** 416+ Commits seit letztem Docs-Update (June 14) — Produktion von Mac auf OCI VM umgezogen, 3000+ Tests, Politician-Sidebar, Embed-Widgets, PDF-Analysis-UI, hunderte Bug-Fixes, Dead-Provider-Cleanup (Wave 1-6), TypeScript-Migration abgeschlossen.

### Staleness Audit

| Dokument | Staleness | Kritisch? |
|---|---|---|
| `architecture.md` | Mac als Prod-Host, `openafd.db`, `config-openafd.yml` — Prod ist jetzt OCI VM `sin-supabase` | YES |
| `api.md` | `openafd` container ref, fehlende Endpoints (add-to-workspace, embed, pdf-analysis) | YES |
| `user-guide.md` | Fehlt: Politician-Sidebar, PDF-Analysis-UI, Embed-Widgets, Keyboard-Shortcuts | YES |
| `data-sources.md` | Party/State-Extraction-Fixes nicht dokumentiert | Medium |
| `docker-deployment.md` | Production-Override-File nicht erwähnt | Medium |
| `README.md` | Mac als Prod-Host, 650+ Tests (tatsächlich 3000+), fehlende Features, kein SOTA-Standard | YES |
| `sync-runbook.md` | Neue Sync-Befehle fehlen | Low |
| `upstream-sync.md` | Dead-Provider-Cleanup nicht erwähnt | Low |
| **Fehlend:** PDF-Analysis-Doc | Komplettes Modul undokumentiert in /docs | Medium |
| **Fehlend:** Embed-Widgets-Doc | Feature undokumentiert | Low |

### Deliverables

| Wave | Inhalt | Status |
|---|---|---|
| 1 | Architektur & Deployment (Mac → OCI VM) | ✅ |
| 2 | API-Referenz & Datenquellen (neue Endpoints) | ✅ |
| 3 | Benutzer-Handbuch (Politician-Sidebar, PDF-Analysis, Embed-Widgets) | ✅ |
| 4 | README Redesign (SOTA-Standard) | ✅ |
| 5 | Neue Dokumentseiten (PDF-Analysis, Sync-Runbook, Upstream-Sync) | ✅ |
| 6 | Sync, Build & Verifikation | ✅ |

---

## Phase 8: Docs UI Polish — Right TOC + Theme Toggle ✅ **COMPLETE**

> **Zeitraum:** Juni 2026  
> **Ziel:** In-App-Doku unter `/docs` bekommt ein persistentes rechtes Inhaltsverzeichnis (wie bei Nextra/Docusaurus) und einen Theme-Umschalter (Hell/Dunkel).  
> **Auslöser:** User-Feedback: "rechts von docs pages immer das dynamische inhaltsverzeichnis so wie andere docs das auch machen und haben" + fehlendes Dark/Light-Icon.

### Problem

| Problem | Aktueller Zustand | Soll-Zustand |
|---|---|---|
| Rechtes Inhaltsverzeichnis | Nur auf `xl` Breakpoint sichtbar (`hidden xl:block w-64`) | Ab `lg` sichtbar + Mobile-Variante |
| Theme-Umschalter | Auf der Docs-Seite nicht vorhanden | Icon-Button in der Docs-Top-Bar |
| Mobile TOC | Keine | Floating-Button + Drawer für kleine Viewports |
| Tests | Keine Tests für Docs-UI | Unit-Tests für ThemeToggle + TOC-Verhalten |

### Deliverables

| Wave | Inhalt | Status |
|---|---|---|
| 1 | Right TOC sichtbar auf `lg` + Mobile-TOC Drawer | ✅ |
| 2 | ThemeToggle extrahiert + in Docs-Header eingebaut | ✅ |
| 3 | Tests (ThemeToggle + Docs-Layout) + Build/Lint/Branding | ✅ |

### Verifikation

- `cd frontend && yarn build` ✅
- `yarn lint:check` ✅
- `yarn test` ✅ 2211 Tests
- `./scripts/check-branding.sh` ✅
- Manuelle Verifikation der Docs-Seite (TOC, Theme-Toggle, Mobile-Drawer) ✅

---

## Phase 9: Security & Operations Hardening ✅ **COMPLETE**

> **Zeitraum:** Juni 2026  
> **Ziel:** Security- und Operations-Dokumentation in die In-App-Doku integrieren und Repo-Governance für Contributors etablieren.  
> **Auslöser:** Phase 8 abgeschlossen; nächster Schritt aus `docs/PLAN-PRODUCTION-READINESS.md` (E7 Governance + E3 Resilience-Vorbereitung).

### Problem

| Problem | Aktueller Zustand | Soll-Zustand |
|---|---|---|
| Security-Handbuch | Nur Root-`SECURITY.md` für Vulnerability-Reporting | Zusätzliches operatives Handbuch in `/docs/security` |
| Operations-Runbook | Verstreut über mehrere Dokumente | Konsolidiertes `/docs/operations` |
| GitHub Governance | Keine Issue-Templates, kein CODEOWNERS | Templates + CODEOWNERS vorhanden |
| Docs-Manifest-Tests | Keine direkten Tests | `docsManifest.test.ts` für neue Einträge |
| Docker-Docs-Sync | `.dockerignore` ließ neue Top-Level-Docs aus | `!docs/*.md` + `!docs/**/*.md` |

### Deliverables

| Wave | Inhalt | Status |
|---|---|---|
| 1 | `docs/SECURITY.md` + `docs/OPERATIONS.md` + In-App-Integration | ✅ |
| 2 | GitHub Issue Templates + `CODEOWNERS` | ✅ |
| 3 | Tests + Build/Lint/Branding + Deploy | ✅ |

### Verifikation

- `cd frontend && yarn build` ✅
- `cd frontend && yarn lint:check` ✅
- `cd frontend && yarn test` ✅ 1636 tests
- `./scripts/check-branding.sh` ✅
- Produktions-Deploy: ✅ 17 Docs-Dateien synchronisiert

---

## Phase 10: Production Readiness ✅ **COMPLETE**

> **Zeitraum:** Juni 2026  
> **Ziel:** Alle remaining epics from `docs/PLAN-PRODUCTION-READINESS.md` umgesetzt: E1 Testing & Quality Gates, E2 Politician Data & Vector Search, E3 Resilience & External-API Hardening, E4 Terminal Endpoint UI, E5 Scale & Deployment, E6 Code Quality & Dependency Hygiene.  
> **Auslöser:** Phase 9 abgeschlossen. 7-Agent Sprint hat alle Epics in paralleler Arbeit abgeschlossen.

### Deliverables

| Wave | Inhalt | Status |
|---|---|---|
| 1 | E1 Testing & Quality Gates (+73 tests, 3602 total, coverage gate set) | ✅ |
| 2 | E2 Politician Data & Vector Search (21. WP migration done, docs fixed) | ✅ |
| 3 | E3 Resilience & External-API Hardening (all callers → ResilientHttpClient) | ✅ |
| 4 | E4 Terminal Endpoint UI (`/api/terminal/exec`) | ✅ |
| 5 | E5 Scale & Deployment (Helm chart linted+tested, prod compose, deployment guide) | ✅ |
| 6 | E6 Code Quality & Dependency Hygiene (deps pinned, refactoring done) | ✅ |

### Verifikation

- 3602 tests passing (frontend + server + integration)
- Coverage gate set at 70% for new/changed code
- Helm chart linted and tested
- Production Docker Compose created and documented
- All external API callers migrated to ResilientHttpClient
- Critical dependencies pinned to exact versions
- Full details in `docs/PLAN-PRODUCTION-READINESS.md`.

---

## Appendix: GitHub Issues Tracker

| Issue | Titel | Phase | Status |
|-------|-------|-------|--------|
| #3 | Missing license headers (MEDIUM) | 6 | ✅ CLOSED (`3e77ed07` — 22 SPDX headers) |
| #4 | Generate SBOM (LOW) | 6 | ✅ CLOSED (`758ffba1` — SPDX 2.3 + CycloneDX 1.5) |
| #5 | Abandoned packages (MEDIUM) | 6 | ✅ CLOSED (`7b2b6e7e` — 2 dead deps removed, 185 audited) |
| #6 | Politiker-Datenbank Module | 2B | ✅ DONE |
| #7 | Deep Research Pipeline | 2C | ✅ DONE |
| #8 | Browser Agent Integration | 6 | ✅ CLOSED (`browser-vision.js` — fetch-page-text + fetch-page-meta) |
| #9 | PDF Report Generator | 2D | ✅ DONE |
| #10 | Unified Agent Orchestrator | 2E | ✅ DONE |
| #20 | SIN-Browser-Tools Integration | 6 | ✅ CLOSED (same as #8 — `browser-vision.js` plugin implemented) |
| #21 | Politician Sync Job | 2B | ✅ CLOSED (`804b6388` — 733 politicians, 7382 speeches synced) |
| #22 | Unit Tests | 6 | ✅ COMPLETE (2211+ tests — Phase 8 Abschluss) |
| #23 | SPDX SBOM | 6 | ✅ CLOSED (`758ffba1` — same as #4) |
| #24 | Finalize CEO Audit | 6 | ✅ CLOSED (`docs/ceo-audit-final.md`) |
| #105 | [P0] esbuild h-[calc(100%-32px)] | 6 | ✅ CLOSED (pattern removed) |
| #106 | [REFACTOR] getStoragePath() Helper — 30+ Files | 6 | ✅ CLOSED (helper in server/utils/paths.js) |
| #108 | [CHORE] Vite define() warning | 6 | ✅ CLOSED (whitelist define in vite.config.js) |
| #111 | [STYLE] 21 inline styles | 6 | ✅ CLOSED (remaining styles are CSS custom properties) |
| #112 | [BUG] NVIDIA NIM model mismatch crash | 6 | ✅ CLOSED (getProviderModelPreference helper) |
| #113 | [BUG] Onboarding 'Weiter' button | 6 | ✅ CLOSED (onboarding disabled, System imported) |
| #114 | [BUG] paths.js Demo-Container | 6 | ✅ CLOSED (explicit COPY + build-time check in Dockerfile) |
| #115 | [CHORE] Branches aufräumen | 6 | ✅ CLOSED (only `main` branch exists, no stale branches) |
| #116 | [BUG] @agent crashes on local providers | 6 | ✅ CLOSED (placeholder apiKey for all local providers) |
| #117 | Repo hardening & consistency | 6 | ✅ CLOSED (`a5950ff0` — branding linter clean, console.log audited) |
| #118 | NEW Änderungen | 6 | ✅ CLOSED (`docs/changelog-recent.md`) |
| #119 | Cloudflare Tunnel 502 Prevention | 2H | ✅ CLOSED (systemd 30s health-check timer active on VM) |
| #121 | i18next Common UI Strings | 3 | ❌ CANCELLED (user chose to ignore i18next warnings — noise-only, no functional impact) |
| #125 | Chart.js TDZ Error | 2H | ✅ CLOSED |

---

## Quick Stats

- **Total Commits:** 320+ (since v1.13.0; 734 total on main since fork)
- **Files Changed:** 2,700+ (350K+ insertions, 150K+ deletions since v1.13.0)
- **CEO Audit:** Grade A (94.5/100 — final audit 2026-06-17, `docs/ceo-audit-final.md`)
- **GitHub Issues:** All closed (inkl. #22 test expansion — 3602 tests)
- **Politician DB:** 733 politicians, 7382 speeches synced (`804b6388`)
- **SBOM:** SPDX 2.3 + CycloneDX 1.5 generated (`758ffba1`, `sbom/` directory)
- **CoDocs:** 0 broken refs, 35+ `.doc.md` companions
- **SPDX Headers:** 22 modules with license header (`3e77ed07`)
- **CI/CD:** Self-hosted CI webhook receiver (ersetzt n8n + GitHub Actions)
- **Tunnel:** 2 Cloudflare Tunnels, unified 30s health check via systemd timer (`9e62abc4`)
- **i18next:** ❌ CANCELLED — user chose to ignore warnings (noise-only, no functional impact); ~1859 warnings remain
- **ESLint:** 0 Errors, 0 Warnings
- **TypeScript:** 100% migration complete (all JSX → TSX)
- **Tests:** 3,602 (1,914 server + 1,688 frontend, 338 test files) — coverage configured: server 21.3% stmts / frontend 53.5% stmts, 70% threshold gate for new/changed code; see `docs/CEO-AUDIT-RERUN-2026-06-23.md`
- **Scale & Deploy:** Helm chart linted + tested, production Docker Compose, Redis session cache documented, CDN for static assets documented
- **Code Quality:** Critical deps pinned to exact versions, oversized files refactored (system.js 2094→8 LOC, updateENV.js 1195→4 LOC)
- **Docs:** /docs mit Landing Page, Kategorien, Suche, persistentem rechten TOC, Theme-Toggle

---

*Next Milestone: All phases complete. OpenSIN-Chat is production-ready.*  
*Owner: @OpenSIN-AI*  
*Updated: 2026-06-23*  
*Current PLAN: [docs/PLAN-PRODUCTION-READINESS.md](docs/PLAN-PRODUCTION-READINESS.md)*
