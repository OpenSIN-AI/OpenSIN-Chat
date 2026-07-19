<!-- SPDX-License-Identifier: MIT -->
# Sources UX Complete — Implementation Plan

> Branch: `fix/sources-ux-complete`  
> Date: 2026-07-19  
> Goal: Make attach / select / pin / mark / cite flows correct, human-legible, and finished.

## Issues

| Pri | Title | GitHub | Status |
|-----|-------|--------|--------|
| P0 | ContextMode migration (expose, pin sync, no double-load) | #677 | done on branch |
| P0 | Inline citation index alignment | #672 | done on branch (#673 closed as dup) |
| P1 | Attach menu semantics (chat vs workspace) | #674 | done on branch |
| P1 | Active thread context chip | #675 | done on branch |
| P2 | Sources sidebar filter / tab / nested list | #676 | done on branch |

## Architecture after fix

```text
User actions
├── + Upload / Dateien select  →  Parsed Files (thread context, temporary)
├── + Existing docs / URL      →  Workspace embeddings (permanent RAG)
├── Manage Workspace ContextMode
│     off     → RAG only
│     summary → always-on summary in prompt
│     full    → always-on full text (syncs legacy pin)
└── Answer citations
      [source:N] 1-based ↔ CONTEXT N ↔ sources[N-1]
```

## Files touched (planned)

### Backend
- `server/utils/files/index.js` — expose contextModes on picker
- `server/models/documents.js` — select contextMode
- `server/endpoints/contextMode.js` — pin sync
- `server/utils/DocumentManager/index.js` — unified always-on loader
- `server/utils/chats/stream.js` — use unified loader; align sources
- `server/utils/AiProviders/appendContext.js` — 1-based CONTEXT labels
- (mirror stream paths in apiChatHandler if needed)

### Frontend
- `ContextModeSelector.tsx` — re-sync mode from props/workspace.documents
- `AddSourceMenu` — sectioned menu, no stubs, clearer copy
- `AttachItem` / `ParsedFilesMenu` — thread-context clarity
- `SourcesSidebar` — filter chips, tab default on new sources
- Locales de/en

## Acceptance checklist

- [x] Context mode survives reload and matches backend (`contextModes` on picker + re-sync UI + pin sync)
- [x] No double full-text injection (`alwaysOnContextDocs` dedupe)
- [x] [source:1] maps to first context doc (1-based CONTEXT + aligned sources)
- [x] + menu distinguishes chat attach vs workspace add
- [x] Active parsed-file count / thread-scope copy visible
- [x] Zitiert filter controllable; nested docs listed; tab switches on new sources

## Verification (automated)

- `server` jest: `appendContext.test.js`, `DocumentManager.alwaysOn.test.js`, `stream.test.js` — pass
- `frontend` vitest: `AddSourceMenu`, `SourcesSidebar` — pass

## Not done in this pass (follow-ups)

- Full browser E2E of Manage Workspace → chat → citation hover
- Other locales beyond de/en for new attach_menu keys (fallback to key/en)
- Re-implement GitHub/Bitbucket attach when product is ready
