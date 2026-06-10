# `BoundedJobStore` — Memory-DoS hardened job registry

What: Capacity- and TTL-bounded `Map` replacement for job-tracking classes
(ResearchPipeline, AgentOrchestrator).

- **maxJobs** — total entries before `JobCapacityError` (env `RESEARCH_MAX_JOBS`, default 100)
- **maxActive** — entries with status `pending|running` before error (env `RESEARCH_MAX_ACTIVE`, default 10)
- **ttlMs** — auto-eviction age (env `RESEARCH_TTL_MINUTES`, default 30 min)

All three settable per-instance or via env var. Throws `JobCapacityError` (`.code = "JOB_CAPACITY"`)
so HTTP endpoints can return 429 instead of 500.

## Usage

```js
const { BoundedJobStore, JobCapacityError } = require("./boundedJobStore");
const store = new BoundedJobStore({ maxJobs: 50, maxActive: 5, ttlMs: 600_000 });

store.set("job-1", { status: "pending" }); // OK
store.set("job-2", { status: "running" }); // may throw if at active limit
store.get("job-1"); // => { status: "pending", _createdAt: ... }
```

## API

Same surface as `Map` for drop-in replacement: `set`, `get`, `has`, `delete`,
`size`, `values`, `keys`, `clear`. Additional: `activeCount()`.

## Dependencies

None — zero-dependency Node.js class.
