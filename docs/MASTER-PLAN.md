# OpenSIN Chat — Master-Plan: Alle offenen Aufgaben

> **Stand:** 2026-06-29
> **Status:** Aktiv — alle Aufgaben sind priorisiert und trackable
> **Repos:** [OpenSIN-AI/OpenSIN-Chat](https://github.com/OpenSIN-AI/OpenSIN-Chat) 
> **Live:** [sinchat.delqhi.com](https://sinchat.delqhi.com) 

---

## P0 — JETZT (Dokumentation & Screenshots)

> Aufwand: ~4h · Status: **bereit zur Ausführung**

### P0-1: Screenshots produzieren (8-10 Stück)

| # | Screenshot | Modus | Zweck | Dateiname |
|---|-----------|-------|-------|-----------|
| 1 | Login-Page | Light | README, User Guide §1 | `screenshots/login-light.png` |
| 2 | Empty State mit 4 Capability-Karten | Light | README Hero, User Guide §1 | `screenshots/empty-state-light.png` |
| 3 | Chat mit Code-Block + Inline-Code | Light | README Features, User Guide §2 | `screenshots/chat-codeblock-light.png` |
| 4 | Chat mit Code-Block | Dark | README Dark Mode | `screenshots/chat-codeblock-dark.png` |
| 5 | Dokumenten-Upload / Workspace | Light | User Guide §2 | `screenshots/documents-light.png` |
| 6 | Sidebar mit Thread-Liste | Light | User Guide §1 | `screenshots/sidebar-light.png` |
| 7 | Mobile (375px) Empty State | Light | README Mobile | `screenshots/mobile-empty-state.png` |
| 8 | Settings-Seite | Light | User Guide §8 | `screenshots/settings-light.png` |
| 9 | Grounding Badge / Quellen | Dark | User Guide §2 | `screenshots/grounding-dark.png` |
| 10 | Notepad Sidebar | Light | User Guide §5 | `screenshots/notepad-light.png` |

**Ablageort:** `docs/screenshots/` in beiden Repos
**Methode:** Playwright headless screenshots von sinchat.delqhi.com

### P0-2: README.md aktualisieren (beide Repos)

- [ ] 
- [ ] 
- [ ] Features-Sektion: Fireworks AI als primärer Provider
- [ ] Features-Sektion: Neue UI-Features (Code-Blocks, Notepad, Grounding Badge, Empty State Cards, Dark/Light)
- [ ] Quick Start: Docker-Port aktualisieren
- [ ] Screenshots einbinden (4-6 im README)
- [ ] Credits: Standard OpenSIN Credits-Text

**Dateien:**
- `OpenSIN-Chat/README.md`
- `OpenSIN-Chat/README.md`

### P0-3: docs/user-guide.md überarbeiten

- [ ] Stand-Datum aktualisieren (2026-06-07 → 2026-06-29)
- [ ] Neue UI-Features dokumentieren:
  - Empty State mit 4 Capability-Karten (Quellen, Notizen, Datenbank, KI mit Quellen)
  - Code-Block mit Kopieren-Button und Language-Label
  - Inline-Code-Styling (Hintergrund, Padding)
  - Notizblock (Notepad Sidebar) — erstellen, bearbeiten, pinnen, löschen
  - Grounding Badge (Sparkle-Icon bei RAG-Antworten)
  - Auto-Summary Cards (Dokument-Snippet-Vorschau)
  - User Message Bubble (rechts, abgerundet, `bg-zinc-700` Dark / `bg-slate-100` Light)
  - Dark/Light Mode Toggle (Design-Button in Sidebar)
  - Mobile Layout (375px — Overlay-Panel, volle Breite)
  - Loading-Animation (3 Pulse-Dots)
  - Action-Buttons (hover-only: TTS, Kopieren, Bearbeiten, Gute Antwort, Mehr)
  - Metrics (hover-only, default hidden)
  - Centered Chat Layout (`max-w-800px`)
  - Scroll-to-Bottom Button
  - Sticky "Neuer Chat" / "Neuer Ordner" am Sidebar-Boden
- [ ] Screenshots einbinden (8-10 im User Guide)
- [ ] Tastatur-Shortcuts verifizieren (`Cmd+K`, `Cmd+N`, `Cmd+U`, `Cmd+/`, `Esc`)
- [ ] Falsche GitHub-Links korrigieren (`Family-Team-Projects/OpenSIN-Chat` → `OpenSIN-AI/OpenSIN-Chat`)
- [ ] FAQ: Kosten-Sektion aktualisieren (Fireworks AI statt Ollama als primär)
- [ ] FAQ: Live-Demo-URL aktualisieren
- [ ] Version: `v0.1.0` → aktuelle Version

**Datei:** `docs/user-guide.md` (beide Repos)

### P0-4: CHANGELOG.md aktualisieren

- [ ] Code-Block-Hintergrund, Border, Radius, Copy-Button
- [ ] Inline-Code-Styling (bg, padding, radius)
- [ ] Blockquote-Styling
- [ ] Agent fireworksai.js Provider-Patch (env-var base URL + User-Agent)
- [ ] EmptyState: 4 Karten, zentriert, `max-w-800px`
- [ ] User Bubble: `bg-zinc-700`/`bg-slate-100`, `rounded-br-sm`
- [ ] PromptInput: `rounded-2xl`, `border-white/10`, `shadow-sm`
- [ ] ChatHistory: `pt-2`, scroll-to-bottom `w-8 h-8`
- [ ] HistoricalMessage: `text-zinc-50` user text, gradient fix
- [ ] Actions: hover-only `md:group-hover:opacity-100`
- [ ] RenderMetrics: default hidden
- [ ] ThreadContainer: sticky bottom-0
- [ ] GroundingBadge: subtle Sparkle styling
- [ ] EmptyState in allen neuen Chats (nicht nur workspace home)

**Datei:** `CHANGELOG.md` (beide Repos)

---

## P1 — BALD (Dokumentation vertiefen + Technical Debt)

> Aufwand: ~3h · Status: **geplant**

### P1-1: DEPLOYMENT_GUIDE.md aktualisieren

- [ ] Port-Änderungen dokumentieren (`38471`/`38472` intern, `38481`/`38482` nginx)
- [ ] Fireworks AI als primärer Provider dokumentieren
- [ ] SINator Pool Router Base URL (`FIREWORKS_AI_LLM_BASE_PATH`)
- [ ] Custom User-Agent Requirement (`OpenSIN-Chat/1.0`)
- [ ] Cloudflare Tunnel Setup (systemd service, config)
- [ ] `docker restart` vs `docker compose down && up` Hinweis (.env-Änderungen)
- [ ] Storage/Collector Verzeichnis-Rechte (`1000:1000`)

**Datei:** `DEPLOYMENT_GUIDE.md` (beide Repos)

### P1-2: docs/architecture.md aktualisieren

- [ ] Fireworks AI Provider-Architektur (zwei Pfade: Chat-LLM + Agent-LLM)
- [ ] SINator Pool Router Flow (Browser → Cloudflare → nginx → Express → Fireworks)
- [ ] Neue UI-Komponenten-Hierarchie (EmptyState, GroundingBadge, NotepadSidebar)
- [ ] `workspace_notes` Tabelle (raw SQL, nicht Prisma migration)
- [ ] WebSocket-Proxy-Kette (nginx → Cloudflare)

**Datei:** `docs/architecture.md` (beide Repos)

### P1-3: SECURITY.md Review

- [ ] Fireworks AI API-Key-Handling (`FIREWORKS_AI_LLM_API_KEY`)
- [ ] SINator Pool Router Auth
- [ ] `.env`-Variablen aktualisieren (alle neuen Vars)
- [ ] Auth-Token (`AUTH_TOKEN`) Dokumentation
- [ ] Port-Binding (`127.0.0.1`) Sicherheits-Impact

**Datei:** `SECURITY.md` (beide Repos)

### P1-4: CONTRIBUTING.md aktualisieren

- [ ] `yarn` nie `npm` (bereits in AGENTS.md, aber CONTRIBUTING erwähnt es nicht)
- [ ] OrbStack statt Docker Desktop auf macOS
- [ ] Brand-Regeln (`scripts/check-branding.sh`) erwähnen
- [ ] CoDocs-Standard erwähnen (`.doc.md` companion files)
- [ ] Verify-Before-You-Claim Regel
- [ ] Commits via `docker cp` für Container-Patches dokumentieren

**Datei:** `CONTRIBUTING.md` (beide Repos)

### P1-5: Server-Patches in Git repos

- [ ] `agentWebsocket.js` — Container-Version mit Git-Version vergleichen, ggf. committen
- [ ] Audit: alle Dateien in Containern gegen Git-Versionen diffen
- [ ] Bei Abweichungen: entweder Container-Version in Git committen oder Container auf Git-Version bringen

**Methode:** `docker exec ... md5sum` für alle `.js` Dateien → mit lokalen md5 vergleichen

---

## P2 — MEDIUM (UI Polish + Technical Debt)

> Aufwand: ~6h · Status: **geplant**

### P2-1: @agent WebSocket via Cloudflare Tunnel

- **Problem:** Cloudflare strippt `Connection: Upgrade` / `Upgrade: websocket` Headers → Stream cancel
- **Aktueller Stand:** nginx WS proxy hinzugefügt, aber Cloudflare Edge killt Connection
- [ ] SSE-Fallback implementieren (Server-Sent Events statt WebSocket)
- [ ] ODER: Cloudflare Dashboard WebSocket-konfigurieren (Zone → Network → WebSockets)
- [ ] Test: `@agent` via `https://sinchat.delqhi.com` ausführen

**Dateien:** `server/endpoints/agentWebsocket.js`, nginx config, Cloudflare Dashboard

### P2-2: Prisma CLI Version-Mismatch

- **Problem:** Container hat Prisma 7.8.0, Projekt hat 5.3.1 — `prisma migrate` fehlschlägt in Container
- **Workaround:** `workspace_notes` via raw SQL erstellt
- [ ] Prisma-Version angleichen (entweder Projekt upgraden oder Container downgraden)
- [ ] `workspace_notes` als echte Prisma Migration definieren
- [ ] `prisma db push` in Container testen

**Dateien:** `server/prisma/schema.prisma`, `server/package.json`

### P2-3: Dependabot-Alerts

- 5 Vulnerabilities (2 high, 2 moderate, 1 low) auf `Family-Team-Projects/OpenAfD-Chat`
- `dependabot/npm_and_yarn/server/cohere-ai-8.0.0`
- `dependabot/npm_and_yarn/server/fix-path-5.0.0`
- [ ] `yarn audit` in OpenAfD-Chat ausführen
- [ ] Betroffene Packages upgraden
- [ ] Tests laufen lassen
- [ ] In OpenSIN-Chat synchronisieren

### P2-4: Settings-Seiten via React Router

- **Problem:** Direkte URL-Navigation zu `/workspace/my-workspace/settings` rendert leere Seite
- **Ursache:** React Router-Route-Konfiguration oder Lazy-Loading-Problem
- [ ] Router-Konfiguration prüfen (`frontend/src/App.tsx` oder `routes.tsx`)
- [ ] Redirect-Logik oder korrektes Rendering bei direkter Navigation
- [ ] Test: `/workspace/my-workspace/settings` direkt aufrufen

### P2-5: Thread-Liste — Virtuelle Liste / Pagination

- **Problem:** 75 Threads werden alle im DOM gerendert → Performance
- [ ] `react-window` oder `react-virtuoso` für virtuelle Liste
- [ ] Thread-Suche/Filter implementieren
- [ ] Thread-Ordner-Kollaps (expand/collapse)

**Datei:** `frontend/src/components/Sidebar/ActiveWorkspaces/ThreadContainer/index.tsx`

### P2-6: Send-Button Polish

- **Aktuell:** `slate-800` mit Text, `slate-400` ohne (Light Mode)
- [ ] Prominenter gestalten (ChatGPT: black/gray-200)
- [ ] Hover-State optimieren

**Datei:** `frontend/src/components/WorkspaceChat/ChatContainer/PromptInput/SendPromptButton.tsx`

### P2-7: @agent Button in Empty State

- **Problem:** Agent-Button nicht sichtbar im Empty State (nur in aktivem Chat)
- [ ] AgentSessionButton in EmptyState PromptInput einbinden
- [ ] Sichtbarkeit prüfen

---

## P3 — SPÄTER (Strukturelle Schulden + Features)

> Aufwand: ~20h+ · Status: **parked**

### P3-1: Strukturelle Schulden (aus FUTURE-PLAN.md)

- [ ] 35 `findMany`-Aufrufe ohne Limit → `take: 100` hinzufügen (~4h)
- [ ] `workspaceEndpoints()` Monster-Funktion (1.520 Zeilen) aufteilen
- **Status:** PARKED — nur angehen wenn DB wächst oder Server crasht

### P3-2: Cloudflare API Token

- [ ] Token mit `zone:edit` scope für automatisierte HSTS/HTTPS-Konfiguration
- [ ] Aktuell manuell konfiguriert

### P3-3: DB-Backup-Verifikation

- [ ] Cron daily 03:00 — prüfen ob Backups funktionieren
- [ ] Test-Restore durchführen
- [ ] Backup-Retention-Policy definieren

### P3-4: Uptime Kuma & Watchdog-Verifikation

- [ ] 2 Monitore auf `status.delqhi.com` — Alerting-Konfiguration prüfen
- [ ] Watchdog-Timer verifizieren:
  - `cloudflared-watchdog` (60s)
  - `sinchat-healthcheck` (120s)
  - `openafd-healthcheck` (120s)
  - `sinchat-external-monitor` (300s)

### P3-5: Audio Overview (Multi-Speaker TTS)

- [ ] Dokumente als Podcast-artige Audio-Zusammenfassung
- [ ] TTS-Pipeline mit mehreren Stimmen
- [ ] Google Gemini TTS oder OpenAI TTS API
- [x] **cvoice.ai TTS-Provider** (6. Engine, 2026-07-08) — 20.000+ Stimmen inkl.
      deutscher Promis (Gronkh, Dieter Bohlen, Joko, Julien Bam, Bushido,
      Daniela Katzenberger). Gratis-Tier: 10 req/min, 1.000 req/Tag.
      API-Key serverseitig, 256-Entry-LRU-Cache für Rate-Limit-Mitigation.

### P3-6: Notizblock Sharing zwischen Workspaces

- [ ] `workspace_notes` Tabelle existiert, Sharing-Logik fehlt
- [ ] Workspace-übergreifende Notiz-Freigabe

### P3-7: Thread-Volltext-Suche

- [ ] Bei 75+ Threads brauchbar
- [ ] Volltext-Suche über Thread-Namen und Chat-Inhalte
- [ ] Search-Box in Sidebar (existiert bereits als UI, muss funktional werden)

### P3-8: Thread-Ordner-Kollaps

- [ ] Ordner können erstellt werden, aber keine Kollaps-Funktion
- [ ] Expand/Collapse-UI mit Persistenz

---

## Tracking

| Priorität | Aufgaben | Aufwand | Status |
|-----------|---------|---------|--------|
| **P0** | 4 Aufgaben (Screenshots, README, User Guide, Changelog) | ~4h | Bereit |
| **P1** | 5 Aufgaben (Deployment, Architecture, Security, Contributing, Server-Patches) | ~3h | Geplant |
| **P2** | 7 Aufgaben (WebSocket, Prisma, Dependabot, Router, Threads, Send-Button, Agent) | ~6h | Geplant |
| **P3** | 8 Aufgaben (Schulden, Infra, Features) | ~20h+ | Parked |

**GitHub Issues:** Werden für beide Repos erstellt — siehe `docs/issues/` Verzeichnis.
