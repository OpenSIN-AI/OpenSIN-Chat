# OpenSIN Chat — PLAN (Nächste Arbeitsschritte)

> Erstellt: 2026-06-12  
> Basis: SoS (State of Session) vom 12. Juni 2026  
> Fokus: 4 parallele Arbeitsstränge mit Priorisierung

---

## Priorität 1: i18next Warnings eliminieren (1859 → 0) ❌ **CANCELLED (by user)**

**Status:** User hat entschieden, die i18next-Warnings zu ignorieren (Issue #121 cancelled). Die Warnings sind noise-only und blockieren keine Funktionalität. Keine weitere Arbeit geplant.

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

## Priorität 2: PDF Analysis Production Hardening ✅ **COMPLETE**

**Status:** Production hardening implementiert — Commit `8c4194a2` (2026-06-17). Alle 8 Schritte abgearbeitet: Concurrency-Tuning, Memory-Limits, Job-Timeout/Cleanup, Fakt-DB Auto-Compact, OCR-Fallback-Logik, 20 CoDocs `.doc.md` companions, Dark-Mode-Fixes.

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

## Priorität 3: Build Cleanup & CI ✅ **COMPLETE**

**Status:** Schritte 3.1–3.4 abgearbeitet (2026-06-17). Clean rebuild durchgeführt, Dockerfile optimiert, patch/minor-Upgrades angewendet. Major-Upgrades dokumentiert, nicht durchgeführt.

**Warum:** Der Build ist korrekt, aber modulepreload-Hints referenzieren alte Chunk-Namen nach dist-Packing.

| Schritt | Task | Details |
|---------|------|---------|
| 3.1 | `rm -rf frontend/dist && yarn build` | Clean rebuild, prüfen ob alte Hints verschwinden |
| 3.2 | Build-Output auf `vendor-charts`-Referenzen scannen | `grep -r "vendor-charts" frontend/dist/` |
| 3.3 | Dockerfile Multi-Stage Build optimieren | `COPY --from=frontend-build` hat 2x yarn install |
| 3.4 | `package.json` outdated deps check | Nach 10 Dependabot PRs → Review + Merge |

**3.1–3.2 Ergebnis (2026-06-17):** Clean rebuild durchgeführt. Keine `vendor-charts`-Referenzen im dist-Output. Alle 17 modulepreload-Hints in `_index.html` resolve korrekt. Keine stale chunks, keine empty chunks, keine fehlenden Referenzen. Vite-Konfiguration ist korrekt — `vendor-charts` ist bewusst nicht gesplittet (ESM TDZ race, siehe `vite.config.js:107-112`).

**3.3 Ergebnis (2026-06-17):** Dockerfile optimiert mit BuildKit cache mounts + layer caching. Siehe Commit `perf(docker): optimize multi-stage build`.

**3.4 Ergebnis (2026-06-17):** Patch/minor-Upgrades angewendet auf frontend (5), server (17), collector (1). Major-Upgrades dokumentiert, nicht durchgeführt:

| Package | Current | Latest | Project | Notes |
|---------|---------|--------|---------|-------|
| react / react-dom | 18.3.1 | 19.2.7 | frontend | React 19 upgrade — separate Phase |
| react-router-dom | 6.30.4 | 7.18.0 | frontend | Router v7 — breaking API changes |
| react-i18next | 14.1.3 | 17.0.8 | frontend | i18next v26+ required |
| i18next | 23.16.8 | 26.3.1 | frontend | Major ecosystem upgrade |
| recharts | 2.15.4 | 3.8.1 | frontend | Chart library v3 |
| tailwindcss | 3.4.19 | 4.3.1 | frontend | Tailwind v4 — CSS-first config |
| eslint | 9.39.4 | 10.5.0 | frontend/server | ESLint v10 |
| @prisma/client / prisma | 5.3.1 | 7.8.0 | server | Prisma v7 — schema migration |
| @langchain/openai | 0.3.17 | 1.4.7 | server | LangChain provider v1 |
| @pinecone-database/pinecone | 2.2.2 | 8.0.0 | server | Pinecone v8 |
| zod | 3.25.76 | 4.4.3 | server | Zod v4 |
| tesseract.js | 5.1.1 / 6.0.1 | 7.0.0 | server/collector | OCR v7 |
| puppeteer | 21.5.2 | 25.1.0 | collector | Puppeteer v25 |
| openai | 6.42.0→6.44.0 | — | root | Root package.json already at ^6.42.0 |

---

## Priorität 4: Infrastruktur — Tunnel Health-Check via systemd ✅ **COMPLETE**

**Status:** systemd 30s health-check timer installiert und aktiv auf der VM — Commit `9e62abc4` (2026-06-17). Ersetzt cron-basierte Checks (60s Minimum) mit einem unified oneshot service (cloudflared process check + URL probe + auto-restart).

**Warum:** Cron erlaubt nur 60s Minimum. launchd `StartInterval` kann auf 30s runter. Gelöst via systemd timer (gleiche Funktionalität, 30s Interval).

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
| **P1: i18next** | ~4-6 Stunden (15 Dateien) | ❌ **CANCELLED** (user chose to ignore warnings) |
| **P2: PDF Hardening** | ~2-3 Stunden | ✅ **COMPLETE** (`8c4194a2`) |
| **P3: Build Cleanup** | ~30 Minuten | ✅ **COMPLETE** (2026-06-17) |
| **P4: systemd HC** | ~30 Minuten | ✅ **COMPLETE** (`9e62abc4`) |
| **P5: Alte Issues** | ~8-12 Stunden | ✅ **ABGEARBEITET** (9 Issues, 2 benötigt Code-Fix, 7 bereits gelöst) |

---

---

## Priorität 6: Politiker-Datenbank Sidebar — Suche, Filter, Quellen (AKTIV)

**Status:** In Arbeit — aus User-Anfrage zur "Abgeordnete"-Icon-Bar (rechtes Panel). Das Panel zeigt aktuell 8 statische AfD-Abgeordnete ohne Interaktion.

**Warum:** Die Liste sieht wie eine Auswahl aus, ist aber statisch und nicht veränderbar. Für einen AfD-Politiker-Nutzer muss die Datenbank durchsuchbar, filterbar und als Quelle für den Chat nutzbar sein.

### Ziele

1. **Datenqualität korrigieren:**
   - `state` (Bundesland) aus `rawData.electoral_data.electoral_list.label` extrahieren (z. B. "Landesliste Bayern" → "Bayern")
   - `profileUrl` auf die menschenlesbare Abgeordnetenwatch-URL setzen (`politician.abgeordnetenwatch_url`), nicht die API-URL
   - Backfill für alle 733 bestehenden Politiker-Records

2. **Backend-API erweitern:**
   - `POST /api/politician/:id/add-to-workspace` (oder `POST /workspace/:slug/politician/:id/embed`) implementieren
   - Lädt Politiker-Profil + Reden, baut Text-Dokument, embedded über `CollectorApi.processRawText` + `Document.addDocuments`
   - Nutzt bestehenden `/politician/search`, `/politician/parties`, `/politician/states` Endpoints für Suche/Filter

3. **Frontend Sidebar (`DatabaseSidebar`) erweitern:**
   - Suchfeld (Name)
   - Partei-Filter (Dropdown/Pills, Default: "AfD")
   - Bundesland-Filter (Dropdown, nach Backfill befüllt)
   - Auswahl-Checkboxen pro Politiker + "Alle auswählen"
   - Pro Politiker: externes Profil-Icon + "Zur Quelle hinzufügen"-Icon
   - Bulk-Action: "Ausgewählte als Quelle hinzufügen"
   - Workspace-Prop von `Sidebars.tsx` durchreichen

4. **Verifikation:**
   - `yarn build` durchlaufen
   - Server-Tests: `yarn test:server`
   - Frontend-Tests: `yarn test` (relevante Komponenten)
   - Manuell: Sidebar öffnen, Filter testen, "Zur Quelle hinzufügen" klicken, Quellen-Panel prüfen

### Akzeptanzkriterien

- [ ] `GET /api/politician/search?q=Weidel&party=AfD` gibt Alice Weidel zurück
- [ ] `GET /api/politician/states` enthält mindestens 5 Bundesländer nach Backfill
- [ ] `POST /api/politician/:id/add-to-workspace` erzeugt ein Dokument im Workspace und startet Embedding
- [ ] Frontend-Sidebar zeigt Suchfeld, Partei-Filter und Bundesland-Filter
- [ ] Einzel- und Bulk-"Zur Quelle hinzufügen" funktioniert ohne Fehler
- [ ] Keine neuen Tests failen

---

*Generated: 2026-06-12 | Last update: 2026-06-21 | P6 in progress*
