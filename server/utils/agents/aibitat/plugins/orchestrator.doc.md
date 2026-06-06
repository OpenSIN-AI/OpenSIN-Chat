# orchestrator.doc.md

**What:** Agent plugin exposing `start_workflow`, `get_workflow_status`, `get_workflow_result` as aibitat functions.

**Why:** Lets the AI agent start complex multi-step workflows during conversations.

**Dependencies:**
- `server/utils/orchestrator` — getOrchestrator singleton

**Caveats:**
- Lazy-loaded to avoid SlowBuffer import chain
- Workflows run async — agent must poll for completion
