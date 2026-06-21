# DatabaseSidebar/index.tsx

## Purpose

Right-hand sidebar panel for the chat view that lets users browse, search, and
filter the local politician database and add politicians to the current
workspace as embedded sources.

## Features

- Live name search.
- Party filter (default: AfD).
- German state (Bundesland) filter.
- Per-politician selection checkboxes.
- "Select all / deselect all" bulk action.
- "Zur Quelle hinzufügen" icon per politician — embeds the politician profile
  plus their last 25 speeches as a document into the workspace vector store.
- Bulk "Add selected" button for the checked politicians.
- External link icon to the Abgeordnetenwatch profile page.

## Data sources

- `/api/politician/search` — filtered politician list.
- `/api/politician/parties` — party dropdown options.
- `/api/politician/states` — state dropdown options.
- `POST /api/politician/:id/add-to-workspace` — add politician as source.

## Props

- `workspace?: { slug?: string }` — current workspace. Passed from `Sidebars.tsx`.
  If absent, the add-to-source buttons are disabled.
