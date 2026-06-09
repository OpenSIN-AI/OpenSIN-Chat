# SidebarTabs

**Purpose:** Renders the horizontal tab strip at the top of the right-sidebar
panels (Memories, Sources). Hosts the three primary mode-switch buttons:
**Quellen** (Sources), **Arbeitsbereich** (workspace-scoped memories) and
**Global** (global-scoped memories).

**Files that import this:**

- `MemoriesSidebar/index.tsx` — always rendered at the top of the Memories
  panel.
- `SourcesSidebar/index.tsx` — rendered inside the Sources panel *only*
  when the inner "Quellen" sub-tab is active (so the user can flip
  sideways into the memory scope while reading a citation list).

**Why the row wraps:**

The right sidebar's content panel is `360px` wide (`Sidebars.jsx:11`,
`PANEL_W`). The three pill labels + their counts are wider than that when
laid out in a single line, so the row uses `flex-wrap` and each pill uses
`min-w-0` so they can shrink and wrap to a second line as needed.

The previous layout used `flex` without wrapping and the pills overflowed
the 360px container. The rightmost pill ("Global") ended up positioned
under the 44px icon column, so clicks at its centre were absorbed by the
icon bar's "Vorschau" button. Users perceived the strip as "broken" —
clicking Quellen or Global appeared to do nothing. Adding `flex-wrap` plus
`min-w-0` on the pills fixes that.

**Behaviour notes:**

- The pill click for "Arbeitsbereich" / "Global" calls
  `selectMemoriesTab(tab)`, which sets the active memory sub-tab. If the
  Memories sidebar is not currently active (e.g. the user clicked the pill
  from inside the Sources sidebar), the helper first calls
  `openSidebar("memories", null)` so the user actually sees the result of
  their click.
- The pill is disabled visually with `opacity-50 pointer-events-none`
  only when the Memories sidebar is not active. That keeps the strip from
  being a "dead" control from the Sources view: clicking the pill always
  does *something* visible.

**Limits & invariants:**

- `LIMITS.workspace = 20`, `LIMITS.global = 5` come from
  `MemoriesContext.tsx` and are shown as `(used/limit)` in the pill
  labels.
- The strip is purely a navigation control — it never fetches or mutates
  memory data. State changes go through `useChatSidebar().openSidebar`
  and `useMemoriesContext().setActiveTab`.
