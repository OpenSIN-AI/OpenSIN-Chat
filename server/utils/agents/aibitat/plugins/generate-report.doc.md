# generate-report.doc.md

**What:** Agent plugin exposing `generate_report` as an aibitat function.

**Why:** Lets the AI agent create AfD-branded PDF reports during conversations, optionally pulling content from a research job.

**Dependencies:**
- `server/utils/reports` — ReportGenerator
- `server/utils/research` — getResearchPipeline (for researchJobId lookup)

**Caveats:**
- Lazy-loaded to avoid SlowBuffer import chain
- Returns download URL, not the PDF binary
