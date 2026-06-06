# contentExtractor.doc.md

**What:** Fetches URL content and converts HTML to clean text for the research pipeline.

**Why:** Research pipeline needs to extract readable content from web search result URLs for LLM summarization. Uses a basic HTML-to-text converter (no DOM parser) so it works in Bree worker processes.

**Dependencies:** None (uses native `fetch`)

**Usage:**
```js
const { ContentExtractor } = require("./contentExtractor");
const text = await ContentExtractor.extract("https://bundestag.de/dip");
// => plain text or null
```

**Caveats:**
- 15s timeout per URL
- Content capped at 10000 chars
- Strips script/style/nav/footer/header tags
- No JavaScript rendering (static HTML only)
