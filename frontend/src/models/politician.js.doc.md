# politician.js

## Purpose

Frontend model for politician-related API calls consumed by the chat UI.

## Methods

- `Politician.addToWorkspace(politicianId, workspaceSlug)` — calls
  `POST /api/politician/:id/add-to-workspace` to embed a politician profile
  (plus their speeches) as a document into the current workspace.

## Returns

```ts
{ success: boolean, data?: object, error?: string }
```

## Consumers

- `DatabaseSidebar` — the "Zur Quelle hinzufügen" icon per politician.
- Bulk "Add selected" action in the same sidebar.
