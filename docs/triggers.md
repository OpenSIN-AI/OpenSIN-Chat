<!-- SPDX-License-Identifier: MIT -->
# Triggers — Automatisierte Agent-Ausführung

> Feature: Rechte Seitenleiste → Agent-Settings → Trigger-Manager

## Übersicht

Triggers führen Agenten automatisch aus — nach Zeitplan (Schedule) oder bei Änderungen (Polling).

### Trigger-Typen

| Typ | Beschreibung | Beispiel |
|---|---|---|
| **Schedule** | Cron-basiert, läuft zu festen Zeiten | "Jeden Werktag um 9 Uhr" → `0 9 * * 1-5` |
| **Polling** | Prüft Connector regelmäßig auf Änderungen | "Neue Gmail-Mail alle 5 Min" |

## Trigger erstellen

1. Öffne **Agent-Settings** in der rechten Icon-Rail
2. Klicke **"Trigger erstellen"**
3. Fülle das Formular aus:
   - **Name:** z.B. "Tägliche Nachrichten-Zusammenfassung"
   - **Agent Name:** Welcher Agent soll ausgeführt werden
   - **Typ:** Schedule oder Polling
   - **Cron Expression** (bei Schedule): z.B. `0 9 * * 1-5`
   - **Prompt:** Was der Agent tun soll
4. Klicke **Speichern**

### Cron-Expression Beispiele

| Cron | Bedeutung |
|---|---|
| `0 9 * * 1-5` | Werktags um 9:00 Uhr |
| `*/30 * * * *` | Alle 30 Minuten |
| `0 0 * * 0` | Sonntags um Mitternacht |
| `0 */2 * * *` | Alle 2 Stunden |
| `0 9 1 * *` | Erster des Monats um 9:00 Uhr |

> Format: `Minute Stunde Tag Monat Wochentag` (Mo-Fr = 1-5)

## Trigger verwalten

### Pausieren/Aktivieren
- Hover über Trigger → **Pause/Play-Icon**
- Pausierte Triggers werden nicht ausgeführt

### Manuell ausführen
- Hover über Trigger → **Play-Icon (gefüllt)**
- Trigger feuert sofort (unabhängig vom Cron-Zeitplan)

### Löschen
- Hover über Trigger → **Trash-Icon**
- Trigger + alle Run-Historie werden gelöscht

### Run-Historie
```bash
GET /api/workspace/:slug/triggers/:triggerId/runs
```
Zeigt die letzten 50 Ausführungen mit Status, Versuchen, Fehlern.

## Zuverlässigkeit

### Exponential Backoff mit Jitter
Bei Fehlern wird der Trigger automatisch wiederholt:
- Versuch 1: sofort
- Versuch 2: ~2s + Jitter
- Versuch 3: ~4s + Jitter
- Versuch 4: ~8s + Jitter
- Versuch 5: ~16s + Jitter
- Versuch 6: **Dead-Letter** (`failed_permanent`)

### Circuit Breaker
Nach 5 aufeinanderfolgenden Fehlern wird der Trigger automatisch pausiert:
- `active = false`
- Console-Log: `Circuit breaker tripped for trigger X`
- Du musst den Trigger manuell reaktivieren

### Idempotenz
Jede Ausführung bekommt einen `dedupe_key` — bei wiederholtem Feuern (z.B. Server-Restart während Run) wird keine Doppelausführung gestartet.

### Replay
Fehlgeschlagene Runs können manuell wiederholt werden:
```bash
POST /api/workspace/:slug/triggers/:triggerId/runs/:runId/replay
```
Oder über die API (UI folgt in Phase 4).

## Architektur

```
TriggerEngine (in-process, 60s Polling)
    ├── Schedule Triggers → cron-parser → nächste Ausführung
    ├── Polling Triggers → Connector-Check → bei Änderung feuern
    ├── Backoff + Jitter → exponential (2^n * 1000 + random)
    ├── Circuit Breaker → 5 failures → auto-pause
    └── Dead-Letter → failed_permanent + Replay
```

### Kein Redis nötig
Trigger-Engine läuft im Server-Prozess (Bree-basiert). Persistenz über Prisma-Tabellen `agent_triggers` + `trigger_runs`. Für Single-VM (Oracle Free Tier) optimiert.

## Konfiguration

| Env-Var | Default | Bedeutung |
|---|---|---|
| `AGENT_MAX_SUBAGENT_DEPTH` | 3 | Max. Subagent-Tiefe (für Trigger-gestartete Agents) |

## API

```
GET    /api/workspace/:slug/triggers                    — Liste
POST   /api/workspace/:slug/triggers                    — Erstellen
PATCH  /api/workspace/:slug/triggers/:triggerId         — Aktualisieren
DELETE /api/workspace/:slug/triggers/:triggerId         — Löschen
POST   /api/workspace/:slug/triggers/:triggerId/toggle  — Pausieren/Aktivieren
POST   /api/workspace/:slug/triggers/:triggerId/fire    — Manuell ausführen
GET    /api/workspace/:slug/triggers/:triggerId/runs    — Run-Historie
POST   /api/workspace/:slug/triggers/:triggerId/runs/:runId/replay — Replay
```

## Troubleshooting

**Trigger feuert nicht:** Prüfe `active: true` und `next_run_at` in der Trigger-Liste.

**Circuit Breaker ausgelöst:** Trigger wurde nach 5 Fehlern auto-pausiert. Reaktiviere manuell.

**`failed_permanent`:** Run hat 5 Versuche überschritten. Nutze Replay oder behebe die Ursache.

**Cron ungültig:** Console-Log zeigt `Invalid cron "..."` — Syntax prüfen (5 Felder, Leerzeichen-getrennt).
