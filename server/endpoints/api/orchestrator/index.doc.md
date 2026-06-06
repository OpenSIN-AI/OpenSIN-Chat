# Orchestrator API endpoints doc

**What:** REST API for goal-driven workflows.

**Endpoints:**
- `POST /api/orchestrator/start` — start a workflow (body: `{goal, steps, options}`)
- `GET /api/orchestrator/list` — list all workflows
- `GET /api/orchestrator/:id` — get workflow status
- `GET /api/orchestrator/:id/result` — get workflow results

**Caveats:**
- Steps auto-inferred from goal text if not explicitly provided
- All endpoints require valid API key
