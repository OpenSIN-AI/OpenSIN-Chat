# PdfAnalysisSidebar

## Purpose

Renders the PDF analysis tools (jobs, facts, cross-check, corpus) as a right sidebar
panel inside the chat workspace. The icon bar toggle is handled by the shared
`ChatSidebar` context.

## Usage

```tsx
import PdfAnalysisSidebar from "./PdfAnalysisSidebar";

// Inside a ChatSidebarProvider, typically via Sidebars.tsx:
<PdfAnalysisSidebar />
```

## Notes

- The panel reuses `PdfAnalysisPanel` exported from `pages/PdfAnalysis/index.tsx` so
  the same UI is shown in both the standalone page and the sidebar.
- Wrapped in `ChatSidebar` so it shares the persisted resizable width with the
  other right sidebar panels.
