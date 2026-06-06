# orchestrator/index.doc.md

**What:** Unified Agent Orchestrator — coordinates PoliticianDB, Deep Research, PDF Reports, and URL extraction into goal-driven multi-step workflows.

**Why:** Complex tasks like "Research X, find politicians, create report" need a single coordinator that chains modules automatically based on the goal description.

**Dependencies:**
- `server/utils/politician` — PoliticianDB search
- `server/utils/research` — Deep Research pipeline
- `server/utils/reports` — PDF Report Generator
- `server/utils/research/contentExtractor` — URL content extraction

**Step Types:**
- `search_politician` — search PoliticianDB
- `deep_research` — run research pipeline (polls until complete, 120s timeout)
- `extract_urls` — extract content from top research result URLs
- `generate_report` — generate AfD-branded PDF

**Auto-Inference:** Goal text is analyzed for keywords (Politik, Recherche, Bericht, etc.) to auto-determine which steps are needed.

**Usage:**
```js
const { getOrchestrator } = require("./orchestrator");
const o = getOrchestrator();
const { workflowId } = await o.startWorkflow({ goal: "Recherchiere AfD-Position..." });
const status = o.getStatus(workflowId);
const results = o.getResults(workflowId);
```

**Caveats:**
- Workflows are in-memory only (lost on server restart)
- Research step polls every 2s with 120s total timeout
- Step inference is keyword-based — explicit steps override auto-detection
