# reports/index.doc.md

**What:** PDF Report Generator — converts research results into AfD-branded PDF reports with cover page, blue header/footer bars, and structured sections.

**Why:** AfD-Fraktion needs professional-looking PDF output from research results for internal distribution.

**Dependencies:**
- `@mintplex-labs/mdpdf` — Markdown-to-PDF conversion
- `pdf-lib` — PDF manipulation (cover page, branding)
- `server/storage/generated-reports/` — output directory

**Templates:**
- `standard` — full report with all sections
- `brief` — short memo (Kurzgutachten)
- `full` — comprehensive analysis (Vollgutachten)

**Usage:**
```js
const { ReportGenerator } = require("./reports");
const result = await ReportGenerator.generate({
  title: "AfD Migrationspolitik",
  query: "AfD Migrationspolitik Bundestag",
  summary: "...",
  template: "standard",
});
// => { filePath, fileName, fileSizeKB }
```

**Caveats:**
- AfD blue (#009ee0) + dark (#0066a5) branding hardcoded
- Cover page uses Helvetica (StandardFonts) — no Unicode support for special chars
- Stored in `server/storage/generated-reports/` (dev) or `STORAGE_DIR/generated-reports/` (prod)
