# PdfAnalysis/index.tsx

**Purpose:** Main entry point for the PDF analysis feature, providing both a standalone page and a reusable panel for the right sidebar.

**Docs:** [PdfAnalysis/index.tsx](index.tsx)

## What this file does

Exports two components:

- `PdfAnalysisPage` — standalone full-page view rendered at `/pdf-analysis`.
- `PdfAnalysisPanel` — the same UI packaged as a panel that can be embedded in the right sidebar (`PdfAnalysisSidebar`).

Manages four tabs:

- `jobs` — upload form and list of analysis jobs.
- `facts` — extracted facts with sources and cross-check actions.
- `crosscheck` — cross-verification of facts against the document corpus.
- `corpus` — corpus comparison view.

Also exports a `TabButton` helper used for the four tab switches.

## Files that touch it

- [`PdfAnalysisSidebar`](../components/WorkspaceChat/ChatContainer/PdfAnalysisSidebar/index.tsx): embeds `PdfAnalysisPanel` in the chat right sidebar.
- [`PdfAnalysisPage`](./index.tsx): standalone route entry.
- [`CrossCheckPanel.tsx`](./CrossCheckPanel.tsx), [`CorpusPanel.tsx`](./CorpusPanel.tsx): tab-specific panels imported by this file.

## Important config values

- `isSidebar` prop: switches padding and layout from full-page (`p-6`) to sidebar (`p-4`) mode.
- Tab button styling mirrors the right sidebar `MemoriesSidebar` pill tabs (`rounded-full`, `h-7`, `text-xs`, `bg-zinc-700` active state).
- `PdfFileInput` uses `whitespace-nowrap shrink-0` so the file-picker label never wraps in narrow sidebar layouts.

## Why certain decisions were made

- The panel is extracted from the page so the standalone page and sidebar share the exact same code and behavior.
- The `TabButton` design is intentionally aligned with the Memories/Chats/Dateien tabs to keep the right sidebar UI consistent.
- Download buttons (.md / .docx / .pdf) keep literal labels because they are universally recognized file extensions.

## Usage

```tsx
import PdfAnalysisPage, { PdfAnalysisPanel } from "@/pages/PdfAnalysis";

// Standalone page
<PdfAnalysisPage />

// Sidebar panel
<PdfAnalysisPanel isSidebar />
```

## Known caveats

- `any` types are used in several places; the file predates stricter TypeScript adoption.
- The `i18next/no-literal-string` rule is intentionally disabled for file-extension labels (.md, .docx, .pdf).
