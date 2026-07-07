# server/utils/backgroundJobs/queue.js

## What it does
Persistent, SQLite-backed background job queue for OpenSIN-Chat. Replaces any
in-memory queue with one that survives Mac-Sleep, server crashes, and Docker
restarts. Single-process safe via atomic CAS-lock (`prisma.updateMany`).

## Touched by
- **Trigger:** `server/utils/chats/stream.js` (after `WorkspaceChats.new()` for
  `GENERATE_THREAD_TITLE`)
- **Boot:** `server/index.js` (calls `start()` after route mounting, `stop()`
  on SIGTERM/SIGINT)
- **Schema:** `server/prisma/schema.prisma` (model `job_queue`)
- **DB:** `server/storage/opensin.db` (table `job_queue`)

## Key constants
| Name | Value | Why |
|---|---|---|
| `POLL_INTERVAL_MS` | 5000 | 5s — fast enough for UX, idle-friendly |
| `JOB_LOCK_TIMEOUT_MS` | 5 min | Stale "processing" jobs older than this are reset |
| `PRUNE_INTERVAL_POLLS` | 1000 | ~83 min between auto-cleanup runs |
| `RETENTION_DAYS` | 7 | Completed/failed jobs older than 7d are deleted |

## Job lifecycle
```
add()  →  pending  →  processing (CAS-lock)  →  completed
                                   ↓ (on throw)
                              attempts < max_attempts?
                                   ↓ yes / no ↓
                                pending  /  failed
```

## Adding a new job type
1. Add a new module under `server/utils/backgroundJobs/jobs/`
2. Register it in `_executeJob()` switch statement
3. Call `BackgroundQueue.add("YOUR_JOB_NAME", payload)` from your trigger

## Known caveats
- **Single-process only.** The CAS-lock prevents races within one Node process.
  For multi-instance deployments, switch to a real broker (BullMQ/Redis).
- **SQLite is the truth.** If the OpenSIN-Chat DB ever switches to PostgreSQL,
  the `file:../storage/opensin.db` datasource must be updated accordingly
  (and the Prisma schema + migration).
