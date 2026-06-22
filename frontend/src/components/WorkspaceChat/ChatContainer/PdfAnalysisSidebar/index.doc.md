# PdfAnalysisSidebar

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
  other right sidebar panels. Defaults to 520px but allows narrowing to 360px,
  since the PDF UI needs more horizontal space than the other sidebars.
