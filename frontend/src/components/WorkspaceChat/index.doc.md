# WorkspaceChat

**Purpose:** Container component for a single workspace's chat. Wraps the
chat UI in the data-loading providers, mounts a key-stable `ChatContainer`
instance per `(workspace, threadSlug)` pair, and renders a "workspace not
found" modal if the route resolves to no workspace.

**Files that import this:**

- `pages/WorkspaceChat/index.jsx` — the workspace route.

**Why we use a `loaded` state instead of the props directly:**

The `loaded` state lags the props by one render. The previous chat stays
mounted while the next chat's history is being fetched, so the user sees
no skeleton-flash when switching workspaces or threads. The effect that
writes to `loaded` runs whenever the props change.

**Critical bug fix (return `false` from `useEffect`):**

Earlier revisions of this effect had `return false` in the
"no workspace slug" branch. `useEffect` callbacks must return either
`undefined` or a *cleanup function*. Returning a non-function value
causes React to call it as a destroy callback, which throws
`TypeError: destroy is not a function` in the commit phase and tears
down the entire React tree — surfacing as the "An error occurred / Reset"
fallback. The fix is to `return;` (or simply omit the return) so the
effect returns `undefined`.

This is the root cause of the "Memories sidebar tabs don't respond" bug:
the workspace crashed at mount, so the right sidebar never appeared
and the tabs the user could see on the previous page were the last
frozen DOM state.

**Why we depend on `[workspace, loading, threadSlug, history, historyLoading]`:**

Each of these is a prop or hook value that influences the contents of
`loaded`. Listing them in the deps array satisfies `react-hooks/exhaustive-deps`
and ensures the effect re-runs when any of them change.
