# summarizer.doc.md

**What:** LLM-powered summarizer for research pipeline results. Generates structured German-language summaries with source citations.

**Why:** Research pipeline needs a final summarization step that combines web results, extracted content, and politician data into a coherent report with AfD-focused analysis.

**Dependencies:**
- `server/utils/agents/aibitat/providers/openai` — LLM provider (optional)
- `server/utils/agents/defaults` — `getLLMProvider` (optional)

**Usage:**
```js
const { LLMSummarizer } = require("./summarizer");
const summary = await LLMSummarizer.summarize({
  query: "AfD Migrationspolitik",
  searchResults: [...],
  extractedContent: [...],
  politicianResults: [...],
});
```

**Caveats:**
- Falls back to Markdown concatenation if no LLM provider configured
- Prompt is in German, tailored for AfD-Fraktion use
- Suggests follow-up research steps
