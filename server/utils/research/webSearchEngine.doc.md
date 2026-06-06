# webSearchEngine.doc.md

**What:** Web search engine wrapper that delegates to the configured search provider (SerpAPI or DuckDuckGo) from SystemSettings.

**Why:** The research pipeline needs web search capability without hard-coding a specific provider. Reuses the existing AnythingLLM agent search infrastructure.

**Dependencies:**
- `server/models/systemSettings.js` — reads `agent_search_provider` and `agent_search_api_key`

**Usage:**
```js
const { WebSearchEngine } = require("./webSearchEngine");
const results = await WebSearchEngine.search("AfD Bundestag");
// => [{ title, link, snippet }, ...]
```

**Caveats:**
- SerpAPI requires an API key in SystemSettings
- DuckDuckGo fallback has limited results (no full organic search via API)
- Results are capped at 10
