# Research API endpoints doc

**What:** REST API for the deep research pipeline — start jobs, check status, get results.

**Why:** Exposes research functionality to the OpenSIN-Chat frontend and external integrations.

**Endpoints:**
- `POST /api/research/start` — start a research job (body: `{query, depth, sources, workspaceId}`)
- `GET /api/research/list` — list all jobs
- `GET /api/research/:id` — get job status
- `GET /api/research/:id/result` — get completed results

**Dependencies:**
- `server/utils/research` — `getResearchPipeline()` singleton
- `server/utils/middleware/validApiKey` — API key auth

**Caveats:**
- Jobs are in-memory only (lost on server restart)
- All endpoints require valid API key
