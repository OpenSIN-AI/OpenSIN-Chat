# Deep Research Pipeline

**File:** `server/utils/research/index.js`
**Purpose:** Orchestrates web search, politician DB lookup, content extraction, and LLM summarization into a single async pipeline with progress tracking.

## Dependencies

- `webSearchEngine.js` — SerpAPI/DuckDuckGo search wrapper
- `contentExtractor.js` — HTML→text extraction (15s timeout, 10K char cap)
- `summarizer.js` — LLM summarization with fallback
- `server/models/systemSettings.js` — LLM provider config
- `server/utils/prisma.js` — DB access

## API

- `startResearch(query, options)` — Start a research job (returns jobId)
- `getJob(jobId)` — Get job status/progress
- `listJobs()` — List all active/recent jobs
- `getResult(jobId)` — Get final research result

## Config

- Job timeout: 120s polling interval, 2s between polls
- Content cap: 10,000 chars per source
- Search: "deep" mode expands queries via LLM

## Caveats

- Jobs tracked in-memory (`Map`) — lost on server restart
- Fallback summary concatenates raw results when no LLM available
- Query expansion only works with LLM provider configured
