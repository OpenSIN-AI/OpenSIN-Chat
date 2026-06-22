# CrossCheckPanel

**Purpose:** Cross-check panel: verify claims against web sources and other references.

**Docs:** [CrossCheckPanel.tsx](CrossCheckPanel.tsx)

## What this file does

Renders the "Kreuz-Verifikation" tab inside `PdfAnalysisPanel`. It lets the user
start a new cross-check job and monitor running or completed jobs.

- `CrossCheckForm` — accepts claims, fact IDs, and comparison sources, then submits
  a new job to the backend.
- `CrossCheckRow` — displays one job with its status, progress, and action buttons
  (show report / cancel).
- `CrossCheckReportModal` — fetches and displays the per-claim verdict matrix plus the
  full prose report.

## Layout notes

- The form is intentionally stacked vertically (`flex-col`) so each source row uses
  the full available width. This prevents German labels like "Entfernen" from being
  truncated in the narrow right sidebar.
- All action buttons carry `whitespace-nowrap` so their text stays on one line.
- Long fact IDs and source values use `truncate` so they show an ellipsis instead of
  overflowing the input field.
- The panel is wrapped by `PdfAnalysisSidebar` which opens at 460px and refuses to go
  below 420px, giving the form enough horizontal room.

## Files that touch it

- [`PdfAnalysis/index.tsx`](./index.tsx): renders `CrossCheckPanel` when the active
  tab is `crosscheck`.
- [`PdfAnalysisSidebar`](../components/WorkspaceChat/ChatContainer/PdfAnalysisSidebar/index.tsx):
  embeds the panel in the chat right sidebar.

## Known caveats

- `any` types are used for the API responses; the file predates stricter TypeScript.
- The vertical source-row layout is optimized for the sidebar width; it looks roomier
  on the standalone page, but keeps behavior identical between the two modes.
