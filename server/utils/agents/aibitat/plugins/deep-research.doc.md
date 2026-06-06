# deep-research.doc.md

**What:** Agent plugin exposing `research_topic`, `get_research_status`, `get_research_result` as aibitat functions.

**Why:** Lets the AI agent start deep research, poll for completion, and retrieve structured results during conversations.

**Dependencies:**
- `server/utils/research` — `getResearchPipeline()` singleton

**Usage:** Agent auto-discovers via `plugins/index.js`. Functions:
- `research_topic(query, depth, sources)` — returns job ID
- `get_research_status(jobId)` — returns progress %
- `get_research_result(jobId)` — returns summary + sources

**Caveats:**
- Research runs async — agent must poll for completion
- Lazy-loaded to avoid SlowBuffer import chain
