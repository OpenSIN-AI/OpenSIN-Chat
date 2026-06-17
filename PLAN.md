# OpenSIN Chat — PLAN (Nächste Arbeitsschritte)

> Erstellt: 2026-06-12  
> Basis: SoS (State of Session) vom 12. Juni 2026  
> Fokus: 4 parallele Arbeitsstränge mit Priorisierung

---

## Priorität 1: i18next Warnings eliminieren (1859 → 0)

**Warum:** 1859 `no-literal-string` Warnings verschleiern echte Probleme in der ESLint-Console. Zusätzlich blockieren sie die Migration zu strikterem Linting.

| Schritt | Datei(en) | Geschätzte Warnings | Aufwand |
|---------|-----------|-------------------|---------|
| 1.1 | `ShowSelectionDropdown/` | ~80 | S |
| 1.2 | `SlashCommandPopup/` | ~90 | M |
| 1.3 | `NewWorkspaceModal/` | ~40 | S |
| 1.4 | `ManageWorkspaceModal/` | ~60 | S |
| 1.5 | `WorkspaceChat/ChatContainer/` | ~120 | M |
| 1.6 | `WorkspaceChat/PromptEditor/` | ~100 | M |
| 1.7 | `SystemSettings/` | ~60 | S |
| 1.8 | `EmbeddingSelection/` | ~30 | S |
| 1.9 | `VectorDatabaseSelection/` | ~40 | S |
| 1.10 | `LLMSelection/` | ~50 | S |
| 1.11 | `AdminSettings/` | ~110 | M |
| 1.12 | `ApiKeyModal/` | ~40 | S |
| 1.13 | Restliche `frontend/src/components/` | ~500 | XL |
| 1.14 | `frontend/src/pages/` | ~200 | L |
| 1.15 | `frontend/src/models/` | ~50 | S |
| 1.16 | Finale Validierung: `yarn lint:check` = 0 Warnings | — | S |

**Definition of Done:** `yarn lint:check` meldet 0 `i18next/no-literal-string` Warnings. Alle deutschen UI-Texte sind übersetzt.

---

## Priorität 2: PDF Analysis Production Hardening

**Warum:** Das 70+ Schritt-Modul ist funktional, aber Konfiguration und Concurrency müssen auf Produktionslast getunt werden.

| Schritt | Task | Details |
|---------|------|---------|
| 2.1 | `PDF_ANALYSIS_MAX_ACTIVE_JOBS` korrekt konfigurieren | Default prüfen, Docker-Healthcheck anpassen |
| 2.2 | Corpus-Concurrency Tuning | `corpus/` Submodule: parallele Vergleiche limitieren |
| 2.3 | Memory-Limit für Vision-Ollama | `localVision.js`: Nach 5 Fehlern deaktivieren, nicht endlos retry |
| 2.4 | Job-Timeout + Cleanup-Scheduler | JobStore cron: Jobs >24h cleanup, orphan detection |
| 2.5 | Fakt-DB Auto-Compact | SQLite `PRAGMA auto_vacuum=INCREMENTAL` + periodischer VACUUM |
| 2.6 | Tesseract.js Fallback-Logik | OCR auf Deutsch (`deu`) + Englisch (`eng`) traineddata |
| 2.7 | `server/utils/pdfAnalysis/` .doc.md für jedes Submodul | CoDocs-Standard nachpflegen |
| 2.8 | Browser-UI Dark Mode Fixes | 4 Tabs: Analyse nicht gerendert bei aktivem Theme-Wechsel |

---

## Priorität 3: Build Cleanup & CI

**Warum:** Der Build ist korrekt, aber modulepreload-Hints referenzieren alte Chunk-Namen nach dist-Packing.

| Schritt | Task | Details |
|---------|------|---------|
| 3.1 | `rm -rf frontend/dist && yarn build` | Clean rebuild, prüfen ob alte Hints verschwinden |
| 3.2 | Build-Output auf `vendor-charts`-Referenzen scannen | `grep -r "vendor-charts" frontend/dist/` |
| 3.3 | Dockerfile Multi-Stage Build optimieren | `COPY --from=frontend-build` hat 2x yarn install |
| 3.4 | `package.json` outdated deps check | Nach 10 Dependabot PRs → Review + Merge |

---

## Priorität 4: Infrastruktur — Tunnel Health-Check via launchd

**Warum:** Cron erlaubt nur 60s Minimum. launchd `StartInterval` kann auf 30s runter.

| Schritt | Task | Details |
|---------|------|---------|
| 4.1 | `com.opensintunnel.healthcheck.plist` erstellen | launchd agent statt cron, KeepAlive + 30s Interval |
| 4.2 | Health-Script portieren | `tunnel-health-check.sh` für launchd umschreiben |
| 4.3 | Cron-Entries deaktivieren | `crontab -e` alte 2 Zeilen löschen |
| 4.4 | launchd Test: `launchctl load` + Validierung | Testfall: Tunnel killen, auto-restart beobachten |

---

## Priorität 5: Alte Issues abarbeiten (aus ROADMAP Phase 3) ✅ **ABGEARBEITET**

| Issue | Titel | Priority | Status |
|-------|-------|----------|--------|
| #105 | [P0] Frontend build broken: esbuild fails on h-[calc(100%-32px)] | **P0** | ✅ Pattern existiert nicht mehr, Build funktioniert |
| #116 | [BUG] @agent crashes on remaining local providers without API keys | P1 | ✅ Placeholder apiKey für localai, litellm, genericOpenAi, lmstudio + opencode-zen in checkSetup() |
| #114 | [BUG] paths.js fehlt im Demo-Container | P1 | ✅ Explicit COPY + build-time check im Dockerfile |
| #113 | [BUG] Onboarding 'Weiter' button kaputt | P1 | ✅ Onboarding deaktiviert, System.markOnboardingComplete() korrekt importiert |
| #112 | [BUG] Agent-Tool Aufrufe crashen Container (NVIDIA NIM mismatch) | P1 | ✅ getProviderModelPreference() Helper implementiert |
| #106 | [REFACTOR] getStoragePath() Helper — 30+ Files | P2 | ✅ Helper in server/utils/paths.js, 30+ Files verwenden ihn |
| #108 | [CHORE] Vite define() warning: process.env exposure | P2 | ✅ Whitelist define in vite.config.js (nur NODE_ENV) |
| #111 | [STYLE] 21 remaining inline styles | P3 | ✅ Verbleibende styles sind CSS custom properties (korrekter Ansatz) |
| #107 | [CHORE] 2 stale git stashes cleanup | P3 | ✅ Keine stashes vorhanden |

---

## Zeitplan

| Priority | Geschätzter Aufwand | Empfohlene Reihenfolge |
|----------|---------------------|----------------------|
| **P1: i18next** | ~4-6 Stunden (15 Dateien) | **Parallel zu P2-P4 möglich** |
| **P2: PDF Hardening** | ~2-3 Stunden | **Nach/parallel zu P1** |
| **P3: Build Cleanup** | ~30 Minuten | **Nach P1+P2** |
| **P4: launchd HC** | ~30 Minuten | **Nach P1+P2** |
| **P5: Alte Issues** | ~8-12 Stunden | ✅ **ABGEARBEITET** (9 Issues, 2 benötigt Code-Fix, 7 bereits gelöst) |

---

*Generated: 2026-06-12 | Next review: weekly*
