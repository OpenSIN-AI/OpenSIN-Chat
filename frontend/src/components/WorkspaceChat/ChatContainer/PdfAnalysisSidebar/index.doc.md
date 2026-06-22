# PdfAnalysisSidebar

**Purpose:** Renders the PDF analysis tools (jobs, facts, cross-check, corpus) as a right sidebar panel inside the chat workspace.

**Docs:** [index.tsx](index.tsx)

## Purpose

Renders the PDF analysis tools (jobs, facts, cross-check, corpus) as a right sidebar
panel inside the chat workspace. The icon bar toggle is handled by the shared
`ChatSidebar` context.

## Usage

```tsx
import PdfAnalysisSidebar from "./PdfAnalysisSidebar";

function App() {
  return <PdfAnalysisSidebar />;
}
```

## Notes

- The panel reuses `PdfAnalysisPanel` exported from `pages/PdfAnalysis/index.tsx` so
  the same UI is shown in both the standalone page and the sidebar.
- Wrapped in `ChatSidebar` so it shares the persisted resizable width with the
  other right sidebar panels. Defaults to 460px and allows narrowing to 420px,
  since the PDF UI needs more horizontal space than the other sidebars (issue #272).
- Rendered by the right icon bar toggle (issue #257). Clicking the PDF analysis icon
  opens this panel in the chat/workspace context instead of navigating to the
  standalone `/pdf-analysis` page.
