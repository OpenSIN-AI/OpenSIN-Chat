# Changelog

## [Unreleased] — Gumloop-Parität (Phase 1–6)

### Added — Phase 1: Live Agent Runs
- **Agent Sessions Panel** — Rechte Seitenleiste zeigt aktive Agent-Läufe in Echtzeit mit Tool-Calls, Status-Icons und Cancel-Button
- **Run-Baum (A2A-Lineage)** — Subagent-Runs erscheinen verschachtelt unter Parent (Traycer-inspiriertes Modell)
- **SSE Multiplex Stream** — Workspace-weiter Live-Stream aller Agent-Runs (`GET /api/workspace/:slug/agent-runs/stream`)
- **runBus** — Zentraler EventEmitter für Run-Lifecycle-Events (start, tool, log, waiting_input, finished, cancel)
- **agent_runs Tabelle** — Persistierung von Runs mit `parent_run_id` für Reconnect-sichere SSE-Snapshots
- **RightSidebarIconBar** — Neuer optisch getrennter Icon-Abschnitt: Agent-Sessions, Agent-Settings, Workspace-Settings
- **Live-Badge** — Anzahl aktiver Runs als Badge auf dem Agent-Sessions-Icon

### Added — Phase 2: OAuth Connector Framework
- **Browser-Login Connectors** — Gmail, Google Drive, Google Docs, Google Sheets, GitHub via OAuth 2.0 + PKCE
- **Coming-Soon Graceful Degradation** — App läuft produktionsreif ohne OAuth-Config (keine Crashes)
- **Token-Vault** — AES-256-GCM verschlüsselte Token-Speicherung via bestehendem EncryptionManager
- **PKCE S256** — Code-Interception-Schutz für alle Provider
- **State-Store** — CSRF-Schutz mit 10min TTL und one-time use
- **Refresh-Coalescing** — Proaktiver Token-Refresh ohne Thundering Herd (inflight-Promise-Map)
- **requires_reauth** — Bei Refresh-Fehler: Flag statt Token-Löschung
- **Per-User-Tokens** — Multi-User-Mode unterstützt (löst `multiUserWarning`-Einschränkung)
- **useConnector Hook** — Frontend-Hook für Connect/Disconnect mit Popup-Handling
- **Provider-Registry** — Zentrale Definition aller OAuth-Provider (`providers.js`)

### Added — Phase 3: Connector-Katalog
- **Tile-Grid UI** — Katalog-Seite mit 11 Connector-Definitionen (Gmail, Drive, Docs, Sheets, GitHub + 6 Coming-Soon)
- **Connect/Disconnect** — Ein-Klick-Verbindung mit Live-Status-Anzeige
- **Coming-Soon Badges** — Lock-Icon für nicht verfügbare/nicht implementierte Connectors
- **Kategorisierung** — Google Workspace, GitHub, Demnächst verfügbar

### Added — Phase 4: Agent/Workspace Settings
- **Agent-Settings Panel** — Model-Auswahl, System-Prompt Editor (expand/collapse), 13 Tool-Toggles, eingebetteter TriggerManager
- **Workspace-Settings Panel** — LLM-Provider (11 Optionen), Embedding-Engine, Vector-DB, Agent-Defaults (Max Tool-Calls)
- **5 Unit-Test-Suites** — AgentRunsContext (buildTree, SSE, activeRunCount), runBus (events), PKCE (verifier, state store), Providers (availability, redirectUri), TriggerEngine (backoff, circuit breaker, idempotency)

### Added — Phase 5: Trigger-Framework
- **Schedule-Trigger** — Cron-basierte Agent-Ausführung mit `cron-parser` für Next-Run-Berechnung
- **Polling-Trigger** — Regelmäßige Connector-Checks mit Checkpoint-Storage
- **TriggerEngine** — Bree-basiert (in-process, kein Redis), 60s Polling-Intervall
- **Exponential Backoff + Jitter** — 2^n * 1000ms + random(0-1000) bei Fehlern
- **Circuit Breaker** — Auto-Pause nach 5 consecutive Failures
- **Dead-Letter-State** — `failed_permanent` nach 5 Versuchen
- **Idempotenz** — `dedupe_key` verhindert Doppelausführung
- **Manueller Replay** — Fehlgeschlagene Runs wiederholbar
- **TriggerManager UI** — Create-Form, Toggle, Fire, Delete, Cron-Anzeige, Next-Run-Zeit
- **useTriggers Hook** — Frontend-CRUD für Trigger

### Added — Phase 6: Subagent API
- **SubagentSpawner** — Isolierte Run-Kontexte mit eigener AIbitat-Instanz, eigenem Chat, eigenem Scratch-Verzeichnis
- **parent_run_id Lineage** — Child-Runs verknüpft mit Parent (Traycer A2A-Modell)
- **subagentPlugin** — LLM Tool `spawn_subagent` für automatisches Spawning durch den Agent
- **spawnParallel** — Mehrere Subagents gleichzeitig
- **Rekursionsschutz** — `AGENT_MAX_SUBAGENT_DEPTH` (default 3)
- **REST Endpoints** — Manueller Spawn + Run-Tree-Abfrage
- **useSubagents Hook** — Frontend-Hook für manuelles Spawning

### Added — Dokumentation & Dev-Tools
- `/docs/agent-sessions.md` — User-Doku für Live-Run-Verfolgung
- `/docs/connectors.md` — User-Doku für OAuth-Connectors
- `/docs/triggers.md` — User-Doku für Trigger-Framework
- `/docs/architecture-diagram.md` — Mermaid-Architektur-Graph
- `CONTRIBUTING-CONNECTORS-TRIGGERS-PLUGINS.md` — Contributing Guide für neue Integrations-Möglichkeiten
- `server/scripts/seed-dev-data.js` — Mock-Daten für lokale Entwicklung (Test-Trigger, Mock-Runs, Fake-Connectors)

### Changed
- `server/app.js` — Registriert `agentRunsStream`, `subagentEndpoints`, `connectorOAuthEndpoints`, `agentTriggerEndpoints`
- `server/utils/agents/aibitat/plugins/index.js` — Registriert `subagentPlugin`
- `server/utils/agents/index.js` — Run-Kontext durchreichen + `subagent-spawner` zu funcsToLoad
- `frontend/src/components/WorkspaceChat/index.tsx` — Wrap mit `AgentRunsProvider`
- `frontend/src/components/WorkspaceChat/ChatContainer/RightSidebarIconBar/index.tsx` — Neuer Agent-Section mit Divider + Live-Badge

### Security
- EncryptionManager bestätigt als AES-256-GCM (authenticated encryption) — sicher für OAuth-Tokens
- PKCE S256 für alle OAuth-Provider
- State-Parameter mit TTL für CSRF-Schutz
- Token-Blobs nie im Frontend exponiert (`listSafe()`)

### Prisma Migrations Required
- `add_agent_runs` — `agent_runs` Tabelle mit `parent_run_id`
- `add_connector_accounts` — `connector_accounts` Tabelle mit verschlüsselten Tokens
- `add_agent_triggers` — `agent_triggers` + `trigger_runs` Tabellen

### New Environment Variables (all optional)
```env
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
SERVER_PUBLIC_URL=https://sinchat.delqhi.com
AGENT_MAX_SUBAGENT_DEPTH=3
```

### New npm Dependencies
- `cron-parser` — Für Trigger-Engine Cron-Berechnung
