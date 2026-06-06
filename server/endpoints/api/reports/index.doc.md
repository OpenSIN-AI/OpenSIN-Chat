# Research API endpoints doc

**What:** REST API for report generation — generate, list, and download AfD-branded PDFs.

**Endpoints:**
- `POST /api/reports/generate` — generate PDF (body: `{title, query, summary, searchResults, politicianResults, extractedContent, template, researchJobId}`)
- `GET /api/reports/list` — list generated reports
- `GET /api/reports/:fileName` — download a report

**Caveats:**
- Can auto-fill content from a research job ID
- Reports stored in `generated-reports/` directory
