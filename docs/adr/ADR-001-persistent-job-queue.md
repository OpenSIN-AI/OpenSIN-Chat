# ADR-001: Persistente Background-Job-Queue via SQLite

**Status:** Accepted
**Date:** 2026-06-07
**Deciders:** Jeremy (OpenAfD-Chat maintainer)

## Context

OpenAfD-Chat ist eine **Sovereignty-first / Offline-first** Fork von AnythingLLM
(`docs/supabase-self-hosted.md`, `SECURITY.md`). Sie läuft typischerweise als
**Single-Node auf einem Mac hinter einem Cloudflare-Tunnel** — kein Container-
Cluster, keine Cloud-Worker, keine externen Broker.

### Das Problem

Hintergrund-Jobs (z.B. das Generieren eines sprechenden Thread-Titels nach
einer Chat-Antwort) waren vorher **nicht persistent**:

* In-Memory-Queues verschwinden beim `node`-Prozess-Exit, beim `SIGTERM`,
  beim Mac-Sleep oder beim Docker-Restart.
* Der Mac geht regelmäßig in den Standby-Modus. Beim Aufwachen waren alle
  in-flight Jobs verloren — der User sah entweder den Default-Namen
  `"Thread"` oder einen `truncate(prompt, 22)`-Hack aus
  `server/models/workspaceThread.js:149`.
* LLM-Aufrufe im HTTP-Request-Loop blockieren die Antwort und koppeln
  Latenz an die LLM-Antwortzeit (typisch 2-10 s).

### Die Kräfte (Forces)

* **Sovereignty:** Keine Cloud-Pflicht, DSGVO-konform, kein Netzwerk-
  Dependency für interne Abläufe.
* **Resilienz:** Jobs müssen Mac-Sleep, Server-Crashes, Docker-Neustarts
  überleben.
* **Einfachheit:** Single-Node, Single-Process, kein Operator-Overhead.
* **Schema-Konsistenz:** OpenAfD-Chat nutzt bereits Prisma + SQLite
  (`openafd.db`). Eine neue DB-Engine einzuführen wäre Architektur-Bloat.
* **Performance:** 1 Chat = 1 Job. Burst-Raten sind klein (User-getrieben,
  kein Batch-Processing).
* **Bestand:** `autoRenameThread` in `server/models/workspaceThread.js:131`
  macht bereits `truncate(prompt, 22)` synchron im Request-Loop — funktional,
  aber qualitativ schlecht und UI-flackert.

## Decision

Wir implementieren eine **persistente, SQLite-basierte Background-Job-Queue**
als Modul `server/utils/backgroundJobs/queue.js`, die:

1. **Im bestehenden Prisma-Schema** lebt (Modell `job_queue`), keine
   neue Datenbank-Engine.
2. **Single-Worker per Polling** arbeitet (5 s Intervall) — kein
   paralleler Worker-Pool, keine externe Broker-Lib.
3. **Atomaren CAS-Lock** via `prisma.updateMany(where: { status: "pending" })`
   verwendet — verhindert Doppel-Verarbeitung auch bei parallelen `add()`-
   Calls ohne `SELECT FOR UPDATE` oder Advisory Locks.
4. **Auto-Recovery bei Stale Locks** (5 min Threshold) — überlebt
   Server-Crashes und Mac-Sleep.
5. **Auto-Pruning** von `completed`/`failed` Jobs nach 7 Tagen —
   verhindert DB-Bloat bei jahrelangem Dauerbetrieb.
6. **Trigger im Stream** (`server/utils/chats/stream.js`) enqueued den
   Job **nach** `WorkspaceChats.new()` mit nur serialisierbaren Daten
   (IDs, Slugs, Strings) im Payload.
7. **Override-Heuristik** im `generateTitle`-Job überschreibt den
   `truncate(prompt, 22)`-Namen, aber **nicht** User-setzte Namen
   (Schutz vor Datenverlust bei manueller Umbenennung).

### Konkrete Konstanten

| Parameter | Wert | Begründung |
|---|---|---|
| `POLL_INTERVAL_MS` | 5000 | 5 s — schnell genug für UX, idle-freundlich |
| `JOB_LOCK_TIMEOUT_MS` | 5 min | Länger als jeder realistische LLM-Aufruf |
| `PRUNE_INTERVAL_POLLS` | 1000 | ~83 Min zwischen Cleanup-Runs |
| `RETENTION_DAYS` | 7 | Debugging-Fenster für fehlgeschlagene Jobs |

### Job-Lifecycle

```
add() → pending → processing (CAS-Lock) → completed
                                    ↓ (throw)
                              attempts < max_attempts?
                                    ↓ yes / no ↓
                                 pending  /  failed
```

### Datei-Layout

```
server/utils/backgroundJobs/
├── queue.js               # PersistentBackgroundQueue (Singleton)
├── queue.doc.md           # CoDoc: was/wozu/wie
└── jobs/
    ├── generateTitle.js   # GENERATE_THREAD_TITLE Handler
    └── generateTitle.doc.md
```

### Schema

```prisma
model job_queue {
  id           Int       @id @default(autoincrement())
  job_name     String
  payload      String    // JSON, nur serialisierbare Daten
  status       String    @default("pending") // pending|processing|completed|failed
  attempts     Int       @default(0)
  max_attempts Int       @default(3)
  last_error   String?
  locked_at    DateTime?
  created_at   DateTime  @default(now())
  updated_at   DateTime  @updatedAt

  @@index([status, created_at])
  @@index([status, locked_at])
}
```

### SQLite-Konfiguration

* `journal_mode=WAL` aktiviert (verhindert Reader/Writer-Blockade zwischen
  Polling und Chat-Saves).
* `npx prisma db push` synct das Schema; `npx prisma generate` aktualisiert
  den Client.

## Consequences

### Positiv

* **Mac-Sleep-sicher:** Queue friert beim Standby ein, wacht automatisch
  auf und arbeitet pending Jobs ab. `_recoverStaleJobs` erkennt
  abgelaufene Locks nach 5 min.
* **Server-Crash-sicher:** Alle `pending`/`processing` Jobs überleben
  `node`-Crash oder `SIGKILL`. Recovery automatisch.
* **DSGVO-/Sovereignty-konform:** Keine Cloud-Queue, keine externen
  API-Keys, keine Telemetrie. Alles in `openafd.db`.
* **Bessere UX:** LLM-generierte Thread-Namen (≤5 Wörter, sprachbewusst)
  statt `truncate(prompt, 22)`. E2E-verifiziert:
  `"Thread"` → `"Keine Wahlprogramme 2025"` mit Nvidia NIM nemotron.
* **Single-Process-Race-frei:** CAS-Lock via `updateMany` funktioniert
  ohne Advisory Locks oder Transaktionen.
* **Wartungsarm:** Auto-Pruning verhindert DB-Bloat. Stats-Helper
  (`BackgroundQueue.stats()`) liefert Queue-Status für Monitoring.
* **Schema-konsistent:** Prisma-Tabelle neben anderen, keine
  separate DB-Engine.
* **Getestet:** 8/8 Tests bestanden inkl. E2E: realer HTTP-Chat
  → Queue → LLM → Thread-Rename, SIGTERM-Shutdown, Stale-Recovery.

### Negativ / Trade-offs

* **Single-Worker-Throughput:** 1 Job pro 5 s. Bei Bulk-Workloads
  (z.B. 1000 Dokument-Embeddings) wäre das zu langsam.
  * Mitigation: Poll-Intervall ist eine einzelne Konstante; parallele
    Worker via `setTimeout`-Staggering wären eine 30-Zeilen-Erweiterung.
* **SQLite-Limit:** Schreibrate ist durch WAL und Disk-I/O limitiert.
  Bei >100 Jobs/s würde die Queue Bottleneck.
  * Mitigation: Realistische Last ist <1 Job/s (1 Chat = 1 Job,
    user-driven). Skaliert mit Chat-Volumen, nicht mit Server-Last.
* **Multi-Instance-unsicher:** CAS-Lock funktioniert nur innerhalb
  eines `node`-Prozesses. Zwei Server-Instanzen auf derselben DB
  könnten denselben Job picken (letzter `updateMany` gewinnt,
  aber ein Job könnte 2x laufen bevor Lock sichtbar wird).
  * Mitigation: OpenAfD-Chat ist Single-Instance per Design
    (Mac-Server, Docker, kein Cluster). Für Multi-Instance:
    siehe "Alternatives Considered".
* **Polling-Latenz:** 5 s Worst-Case zwischen `add()` und Verarbeitung.
  * Akzeptabel: Title-Rename ist nicht zeitkritisch, das Frontend zeigt
    sofort den `autoRenameThread`-Namen und überschreibt ihn ~5 s später
    per SSE-Event (vom Frontend zu implementieren, falls gewünscht).
* **Op-Lock auf Big-Jobs:** `_recoverStaleJobs` setzt jeden Job zurück
  der >5 min braucht. Ein Dokument-Embedding-Job mit 1 Mio Tokens
  würde das schaffen. Hier muss `JOB_LOCK_TIMEOUT_MS` per Job erhöht
  werden (zukünftiges Feature).

## Alternatives Considered

### 1. In-Memory-Queue (Status quo ante)

* **Pro:** Simpel, keine DB-Schreibzugriffe.
* **Contra:** Verliert alle Jobs bei Mac-Sleep, Server-Crash, Docker-Restart.
  Inakzeptabel auf einer Sovereignty-Plattform.
* **Verdict:** Verworfen.

### 2. Supabase-basierte Queue

OpenAfD-Chat hat bereits optionale Supabase-Storage-Anbindung
(`server/utils/storage/supabase.js`, `docker/docker-compose.supabase.yml`).

* **Pro:** Bestehende Infrastruktur wiederzuverwenden klingt effizient.
* **Contra:**
  * Verletzt Sovereignty-Prinzip: Cloud-Queue = externes Netzwerk-Dependency
    für interne Abläufe.
  * Self-hosted Supabase ist **kein** "kein Cloud" — Kong-Gateway,
    Postgres, Storage-API, JWT-Verwaltung. Hoher Operations-Overhead.
  * Wenn Supabase ausfällt, sollen Titel-Generierungen trotzdem laufen
    (Chat-Saves liegen in SQLite, Uploads nur *optional* in Supabase).
  * Queue-Daten brauchen keine Postgres-Features (Replikation, RLS, JSONB).
* **Verdict:** Verworfen. Storage-Anbindung bleibt optional, Queue nicht.

### 3. Redis + BullMQ

* **Pro:** Production-grade, parallele Worker, Retries, Schedules.
* **Contra:**
  * Redis ist eine **zusätzliche** Infrastruktur-Komponente, die nichts
    anderes in OpenAfD-Chat nutzt.
  * DSGVO: Redis-Snapshots müssen verschlüsselt/sofort gelöscht werden.
  * Mac-Sleep: Redis müsste auch laufen (Homebrew-Service), zusätzlicher
    Boot-Order-Konflikt.
  * Overkill für 1 Job/s Last.
* **Verdict:** Verworfen. Wenn Bulk-Workloads kommen, ADR-002.

### 4. PostgreSQL (gleicher DB-Server wie Supabase, aber als Queue-Tabelle)

* **Pro:** Transactional Safety, Row-Level-Locks.
* **Contra:** OpenAfD-Chat läuft primär auf SQLite (siehe
  `migration_lock.toml:provider = "sqlite"` und `openafd.db`-Pfad).
  Postgres-Switch ist explizit "out of scope" und nicht in der
  `setup`/`prisma:setup` Script-Chain.
* **Verdict:** Verworfen. Würde Architektur-Wechsel voraussetzen.

### 5. PostgreSQL `LISTEN/NOTIFY` für sofortiges Polling-Trigger

* **Pro:** Sub-Sekunden-Latenz, kein Polling.
* **Contra:** SQLite hat kein `LISTEN/NOTIFY`. Würde nur mit Postgres
  funktionieren → siehe #4.
* **Verdict:** Verworfen aus SQLite-Constraint.

### 6. Node's `worker_threads` für In-Process-Queue

* **Pro:** Shared-Memory, schnell, kein DB-Roundtrip.
* **Contra:** Verliert bei Process-Exit. Worker-Threads sind keine
  Persistenz-Lösung.
* **Verdict:** Verworfen. Selbes Problem wie #1.

### 7. `p-queue` (bereits im Dependency-Tree: `server/package.json:78`)

* **Pro:** Battle-tested, gut dokumentiert, in-memory mit Promise-API.
* **Contra:** Rein in-memory. Keine Persistenz.
* **Verdict:** Verworfen für persistente Jobs. Bleibt nützlich für
  bursty In-Memory-Concurrency-Limits (LLM-Provider-Rate-Limits).

## References

### Code

* `server/utils/backgroundJobs/queue.js` — Implementierung
* `server/utils/backgroundJobs/queue.doc.md` — CoDoc-Companion
* `server/utils/backgroundJobs/jobs/generateTitle.js` — Job-Handler
* `server/prisma/schema.prisma` — `job_queue` Modell
* `server/utils/chats/stream.js:335-344` — Trigger
* `server/index.js:202-220` — `start()` + SIGTERM/SIGINT
* `server/models/workspaceThread.js:131-154` — `autoRenameThread` (synchroner Pre-Step)
* `server/endpoints/chat.js:151-162` — wo `autoRenameThread` aufgerufen wird

### Konzept & Inspiration

* AnythingLLM BackgroundWorkerService (`server/utils/BackgroundWorkers/`)
  — Inspiration für die Lifecycle-Granularität, aber nicht für die
  Persistenz.
* [AnythingLLM PR #1907](https://github.com/Mintplex-Labs/anything-llm/pull/1907)
  — `b5a2437b patch docker scout CVE in old express-ws pkg` —
  Hinweis dass Mintplex aktiv an CVEs arbeitet; OpenAfD-Chat sollte
  upstream-synchen und **diesen ADR unverändert lassen** (kein
  schema-merge-konflikt, da `job_queue` am Ende von `schema.prisma`).

### Commit

* `acc97958 feat(server): persistenter Background-Job-Queue + defensiver WS-Guard`
  — enthält den Code, die Schema-Migration, den Stream-Trigger und den
  Bonus-Fix in `agentWebsocket.js` (defensiver Guard gegen pre-existing
  `app.ws`-Bug, der den Server-Boot blockierte).

### Verifikation

* **WAL aktiv:** `sqlite3 server/storage/openafd.db "PRAGMA journal_mode;"` → `wal`
* **E2E-Test:** `curl POST /api/workspace/test/thread/<slug>/stream-chat`
  mit `"Was sind die wichtigsten Wahlprogramme zur Bundestagswahl 2025?"`
  → SSE-Stream → `autoRenameThread` setzt truncated Name →
  Queue pickt Job nach 5 s → LLM (Nvidia NIM nemotron) generiert
  `"Keine Wahlprogramme 2025"` (4 Wörter, deutsche Sprache).
* **SIGTERM-Test:** Process beendet sich mit "Background queue stopped."
