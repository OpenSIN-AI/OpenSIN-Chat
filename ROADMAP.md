# OpenAfD Chat — ROADMAP (GSD-Style)

> **GSD-Phasen:** Get Shit Done — jede Phase ist ein abgeschlossenes Deliverable.  
> **Aktueller Stand:** Phase 2 fast fertig, Phase 3 in Planung.  
> **Repo:** [Family-Team-Projects/OpenAfD-Chat](https://github.com/Family-Team-Projects/OpenAfD-Chat)  
> **Letztes Update:** 2026-06-06

---

## Phase 1: Foundation & Core Re-Fork ✅ **COMPLETE**

> **Zeitraum:** Mai 2025 – Juni 2026  
> **Ziel:** OpenAfD-Chat als produktionsreifes, eigenständiges Fork-Produkt etablieren.  
> **CEO Audit Grade:** A (96.8/100)

### Deliverables

| # | Feature | Status | Commit / Issue |
|---|---------|--------|---------------|
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

## Phase 2: Core Features & Integration 🔄 **IN PROGRESS (90%)**

> **Zeitraum:** Juni 2026  
> **Ziel:** Alle neuen OpenAfD-Features in die Codebase integrieren, AI-Providers verbinden, UI/UX polieren.  
> **Blocker:** Browser-Cache (User), Vercel Pool Credits, Politician DB leer

### 2A: AI Provider Integration ✅

| # | Feature | Status | Commit / Issue |
|---|---------|--------|---------------|
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
|---|---------|--------|---------------|
| 2.11 | PoliticianDB (Bundestag API, Abgeordnetenwatch) | ✅ | `6c81d5e8` |
| 2.12 | Plenarprotokoll Scraper | ✅ | `6c81d5e8` |
| 2.13 | REST API (`/api/politician/*`) | ✅ | `6c81d5e8` |
| 2.14 | Agent Plugin (`@politician-search`) | ✅ | `6c81d5e8` |
| 2.15 | Bree Sync Job (`sync-politician-data.js`) | ✅ | `6c81d5e8` |
| 2.16 | SQLite Fallback (kein pgvector) | ✅ | `semanticSearchSpeeches` gibt `[]` zurück |
| 2.17 | PoliticianVectorStore (pgvector ready) | ⚠️ | Implementiert, aber SQLite = kein Vektor-Store |

> **Blocker:** Sync-Job noch nicht gelaufen → DB leer. Siehe Issue #21.

### 2C: Deep Research Pipeline ✅

| # | Feature | Status | Commit / Issue |
|---|---------|--------|---------------|
| 2.18 | Research Orchestrator (`/api/research`) | ✅ | `89f4d4b9` |
| 2.19 | Web Search Engine (SerpAPI + DuckDuckGo) | ✅ | `89f4d4b9` |
| 2.20 | Content Extractor (HTML → Text, 15s Timeout) | ✅ | `89f4d4b9` |
| 2.21 | Summarizer (LLM + Fallback) | ✅ | `89f4d4b9` |
| 2.22 | Research Agent Plugin (`@deep-research`) | ✅ | `89f4d4b9` |

### 2D: PDF Report Generator ✅

| # | Feature | Status | Commit / Issue |
|---|---------|--------|---------------|
| 2.23 | PDF Generator (`/api/reports`) | ✅ | `89f4d4b9` – mdpdf + pdf-lib |
| 2.24 | AfD Branding (Cover, Header, Footer) | ✅ | `89f4d4b9` – StandardFonts.Helvetica |
| 2.25 | Report Agent Plugin (`@generate-report`) | ✅ | `89f4d4b9` |

### 2E: Unified Agent Orchestrator ✅

| # | Feature | Status | Commit / Issue |
|---|---------|--------|---------------|
| 2.26 | Orchestrator (`/api/orchestrator`) | ✅ | `89f4d4b9` – Goal → Steps Auto-Inference |
| 2.27 | Orchestrator Agent Plugin (`@orchestrator`) | ✅ | `89f4d4b9` |
| 2.28 | Plugin Registry (alle 3 neuen Plugins) | ✅ | `89f4d4b9` – `plugins/index.js` |

### 2F: UI/UX Polishing 🔄

| # | Feature | Status | Commit / Issue |
|---|---------|--------|---------------|
| 2.29 | SidebarTabs (Quellen ↔ Erinnerungen) | ✅ | `b36e0144` |
| 2.30 | SourcesSidebar (Chat-Zitate + Workspace-Fallback) | ✅ | `8ac62a24` – mit `MemoriesProvider` fix |
| 2.31 | SourceFilter (Alle/Dokumente/Medien) | ✅ | `8ac62a24` + Translations |
| 2.32 | ChatSettingsMenu (SourcesRow + SourceFilterRow) | ✅ | `8ac62a24` |
| 2.33 | MemoriesSidebar Syntax Fix (`>` → `);`) | ✅ | `620f849d` |
| 2.34 | Piper-TTS Import Fix (`@openafd` → `@mintplex-labs`) | ✅ | `620f849d` |
| 2.35 | Translations (de + en) | ✅ | `source_filter_*`, `workspace_sources` etc. |
| 2.36 | Frontend Build & Deploy (83 Assets) | ✅ | `8593bcf1` + `8ac62a24` |
| 2.37 | OpenCode Zen in Provider Picker | ⚠️ | Backend ✅, Browser-Cache Blocker (User) |
| 2.38 | Document Processor 503 | ⚠️ | Python-Service offline – erwartet, kein Bug |
| 2.39 | Logo 204 (No Custom Logo) | ⚠️ | Harmless – kein Custom Logo hochgeladen |

### Phase 2 Blocker

| Blocker | Status | Action |
|---------|--------|--------|
| **User Browser Cache** | 🔴 | Hard Refresh (`Cmd+Shift+R`) oder DevTools → Clear Site Data |
| **Vercel Pool Credits** | 🔴 | `insufficient_funds` – Credits nachladen |
| **Politician DB leer** | 🔴 | Sync-Job noch nicht gelaufen → Issue #21 |
| **npm audit (44 vulns)** | 🟡 | `--force` nötig, aber upstream transitive deps |
| **AIbitat `opencode-zen` Case** | ✅ | Gefixt in `3690f5ed` |

---

## Phase 3: Production Hardening & Scale 📅 **PLANNED**

> **Ziel:** Vollständige Produktionsreife, Compliance, Tests, Scale-Out.  
> **ETA:** Juni – Juli 2026

### 3A: Testing & Quality Gates

| # | Feature | Status | Issue |
|---|---------|--------|-------|
| 3.1 | Unit Tests (Politician DB) | 📅 | #22 |
| 3.2 | Unit Tests (Research Pipeline) | 📅 | #22 |
| 3.3 | Unit Tests (PDF Reports) | 📅 | #22 |
| 3.4 | Unit Tests (Orchestrator) | 📅 | #22 |
| 3.5 | Integration Tests (E2E Chat Flow) | 📅 | #22 |
| 3.6 | Performance Tests (Nemotron 1M Context) | 📅 | – |
| 3.7 | CEO Audit Re-Run (nach Fixes) | 📅 | #24 |
| 3.8 | Close CEO Audit Gaps (3 MEDIUM, 2 LOW) | 📅 | #24 |

### 3B: Compliance & Security

| # | Feature | Status | Issue |
|---|---------|--------|-------|
| 3.9 | SPDX SBOM Generation | 📅 | #23, #4 |
| 3.10 | License Headers (remaining MEDIUM) | 📅 | #3 |
| 3.11 | Abandoned Packages Audit (MEDIUM) | 📅 | #5 |
| 3.12 | npm audit --force (44 vulns) | 📅 | #5 |
| 3.13 | Secret Rotation (Vercel Pool 12 Tokens) | 📅 | – |
| 3.14 | Dependabot Weekly Scan | ✅ | `.github/dependabot.yml` |
| 3.15 | CEO Audit CI (automated) | ✅ | `.github/workflows/ceo-audit.yml` |

### 3C: Data & Sync

| # | Feature | Status | Issue |
|---|---------|--------|-------|
| 3.16 | Politician Sync Job (erster Lauf) | 📅 | #21 |
| 3.17 | Bundestag 21. WP Migration (parliament ID) | 📅 | – |
| 3.18 | Abgeordnetenwatch API v2 (neue Felder) | 📅 | – |
| 3.19 | PostgreSQL + pgvector (Production DB) | 📅 | – |
| 3.20 | PoliticianVectorStore aktivieren | 📅 | – |
| 3.21 | Full-Text Search (Speeches, Protocols) | 📅 | – |

### 3D: Browser & Vision

| # | Feature | Status | Issue |
|---|---------|--------|-------|
| 3.22 | SIN-Browser-Tools Integration (Vision) | 📅 | #20, #8 |
| 3.23 | Video Analysis (Frame Extraction) | 📅 | #8 |
| 3.24 | URL Analysis (Auto-Scrape) | 📅 | #8 |
| 3.25 | Browser Agent Plugin (`@browser-agent`) | 📅 | #8 |
| 3.26 | Screenshot → LLM Vision Pipeline | 📅 | #8 |

### 3E: Scale & Deploy

| # | Feature | Status | Issue |
|---|---------|--------|-------|
| 3.27 | Cloudflare Tunnel (openafd.delqhi.com) | ✅ | Aktiv |
| 3.28 | Docker / OrbStack Production | 📅 | – |
| 3.29 | Helm Chart (Kubernetes) | 📅 | `cloud-deployments/helm/` |
| 3.30 | OpenShift / AWS / GCP Deployments | 📅 | `cloud-deployments/` |
| 3.31 | Multi-Node (Horizontal Scaling) | 📅 | – |
| 3.32 | Redis (Session Cache) | 📅 | – |
| 3.33 | CDN (Assets) | 📅 | – |

### 3F: Memories & Widgets (Post-MVP)

| # | Feature | Status | Plan Doc |
|---|---------|--------|----------|
| 3.34 | Memory System (Auto-Extraction) | 📅 | `docs/PLAN-MEMORIES.md` |
| 3.35 | Memory Vector Store (pgvector) | 📅 | `docs/PLAN-MEMORIES.md` |
| 3.36 | Memory Privacy Controls | 📅 | `docs/PLAN-MEMORIES.md` |
| 3.37 | Embeddable Widget API | 📅 | `docs/PLAN-WIDGET-API.md` |
| 3.38 | Widget SDK (React, Vue, Vanilla) | 📅 | `docs/PLAN-WIDGET-API.md` |
| 3.39 | Voice/Vision Enhancements | 📅 | `docs/PLAN-VOICE-VISION.md` |
| 3.40 | Multi-Provider Fallback Chain | 📅 | `docs/PLAN-MULTI-PROVIDER.md` |

---

## Appendix: GitHub Issues Tracker

| Issue | Titel | Phase | Status |
|-------|-------|-------|--------|
| #3 | Missing license headers (MEDIUM) | 3B | 🔴 OPEN |
| #4 | Generate SBOM (LOW) | 3B | 🔴 OPEN |
| #5 | Abandoned packages (MEDIUM) | 3B | 🔴 OPEN |
| #6 | Politiker-Datenbank Module | 2B | ✅ DONE (Code) – Sync offen |
| #7 | Deep Research Pipeline | 2C | ✅ DONE (Code) |
| #8 | Browser Agent Integration | 3D | 📅 PLANNED |
| #9 | PDF Report Generator | 2D | ✅ DONE (Code) |
| #10 | Unified Agent Orchestrator | 2E | ✅ DONE (Code) |
| #20 | SIN-Browser-Tools Integration | 3D | 📅 PLANNED |
| #21 | Politician Sync Job | 3C | 🔴 OPEN (Blocker) |
| #22 | Unit Tests | 3A | 🔴 OPEN |
| #23 | SPDX SBOM | 3B | 🔴 OPEN |
| #24 | Finalize CEO Audit | 3A | 🔴 OPEN |

---

## Quick Stats

- **Total Commits:** 20+ (Phase 1 + 2)
- **Files Changed:** 150+ (neue Module + Fixes)
- **CEO Audit:** Grade A (96.8/100)
- **GitHub Issues:** 13 offen, 0 geschlossen
- **CoDocs:** 0 broken refs, 21+ `.doc.md` companions
- **SPDX Headers:** 21 Module mit License-Header
- **CI/CD:** 2 Workflows (CEO Audit + Dependabot)

---

*Next Milestone: Phase 2 Closure (Browser-Cache fix + Vercel Credits + Politician Sync)*  
*Owner: @Family-Team-Projects*  
*Updated: 2026-06-06*
