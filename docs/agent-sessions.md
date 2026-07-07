<!-- SPDX-License-Identifier: MIT -->
# Agent Sessions — Live-Verfolgung von Agent-Läufen

> Feature: Rechte Seitenleiste → Agent-Sessions Icon (Broadcast-Symbol)

## Übersicht

Agent Sessions zeigt alle aktiven und kürzlich abgeschlossenen Agent-Läufe in Echtzeit. Du siehst:

- **Run-Baum** — Parent-Runs mit verschachtelten Child-Runs (Subagent-Lineage)
- **Live Tool-Calls** — Jeder Tool-Aufruf mit Name + Status (running/done/error)
- **Status-Icons** — Spinner (running), ✓ (done), ✗ (error), ⏸ (waiting for input)
- **Cancel-Button** — Aktive Runs abbrechen (Hover über Run → Stop-Icon)

## Bedienung

### Run anzeigen
1. Klicke das **Broadcast-Icon** in der rechten Icon-Rail
2. Das Panel öffnet sich (340px breit)
3. Starte einen Agent-Chat → Run erscheint automatisch live

### Run abbrechen
1. Hover über einen aktiven Run (Spinner-Icon)
2. Klicke das **Stop-Icon** rechts
3. Run-Status wird "cancelled"

### Subagents beobachten
Wenn ein Agent einen Subagent spawned:
- Child-Run erscheint eingerückt unter dem Parent
- Child hat eigenen Status, eigene Tool-Calls
- Baum kann beliebig tief werden (max. `AGENT_MAX_SUBAGENT_DEPTH`, default 3)

## Architektur

```
AgentHandler → AIbitat → runBus (EventEmitter)
                              ↓
                    agentRunsStream.js (SSE Multiplex)
                              ↓
                    AgentRunsContext.tsx (React Context)
                              ↓
                    AgentSessionsSidebar (Panel UI)
                              ↓
                    buildTree() → Lineage-Baum
```

### Event-Typen

| Event | Bedeutung |
|---|---|
| `run.started` | Run gestartet (runId, parentRunId, agentName, model) |
| `run.tool` | Tool-Call (phase: args/result/error) |
| `run.log` | Log-Zeile (introspect-Ausgabe) |
| `run.waiting_input` | Run wartet auf User-Eingabe |
| `run.finished` | Run beendet (status: done/error/cancelled) |

### Reconnect-Sicherheit

Bei Verbindungsabbruch (Network offline, Tab-Wechsel):
- EventSource reconnectet automatisch
- Beim Reconnect: Snapshot aller aktiven Runs aus DB wird gesendet
- Keine Runs gehen verloren

## Konfiguration

| Env-Var | Default | Bedeutung |
|---|---|---|
| `AGENT_WS_MAX_CONNECTIONS` | 50 | Max. gleichzeitige SSE-Verbindungen |
| `AGENT_MAX_TOOL_CALLS` | 10 | Max. Tool-Calls pro Run |
| `AGENT_MAX_SUBAGENT_DEPTH` | 3 | Max. Subagent-Verschachtelungstiefe |

## API

### SSE Stream
```
GET /api/workspace/:slug/agent-runs/stream?token=JWT
```

### Run abbrechen
```
POST /api/workspace/:slug/agent-runs/:runId/cancel
```

### Run-Tree abfragen
```
GET /api/workspace/:slug/agent-runs/:runId/tree
```

### Subagent manuell spawnen
```
POST /api/workspace/:slug/agent-runs/:runId/spawn
Body: { "agentName": "research-agent", "prompt": "..." }
```

## Troubleshooting

**Panel bleibt leer:** Starte einen Agent-Chat — Runs erscheinen nur bei aktiven Agent-Läufen.

**Keine Live-Updates:** Prüfe Network-Tab im Browser — SSE-Verbindung sollte offen sein (`text/event-stream`).

**Subagent erscheint nicht:** Prüfe `AGENT_MAX_SUBAGENT_DEPTH` in `.env` — bei Überschreitung wird Fehler geworfen.
