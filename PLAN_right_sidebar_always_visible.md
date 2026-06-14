# Plan: Right Sidebar Icon Bar Always Visible

**Status:** Draft — pending approval before implementation.  
**Goal:** Remove the collapse/expand toggle icon and keep the right sidebar icon bar permanently visible. The panel area continues to open/close via the individual panel icons.

## 1. Background

The chat container renders a right sidebar area via `Sidebars.jsx`. That area currently has two states:

1. **Expanded** (`rightSidebarOpen === true`): shows the full 360px panel (if an icon is active) plus the 44px icon bar with all icons.
2. **Collapsed** (`rightSidebarOpen === false`): shows only a 44px column containing the toggle button.

The toggle button at the top of the icon bar switches between these two states. The state is persisted in `localStorage` under the key `openafd_right_sidebar_open`.

The user wants the icon bar to always show all icons and never be collapsed, so the toggle icon is no longer needed.

## 2. Scope

### In scope
- Remove the toggle icon from the right sidebar icon bar (entire `RightSidebarToggleButton` component).
- Keep the 44px icon bar always rendered with all 7 panel icons.
- Preserve the panel open/close behavior driven by individual panel icons (via `activeSidebar`/`toggleSidebar`).
- Update affected unit tests and verify no regressions.
- Verify the existing E2E upload test still passes.
- Verify frontend build succeeds.
- No changes to mobile behavior (already works — icon bar takes 44px in the flex layout).

### Out of scope
- Changing the left sidebar.
- Changing mobile behavior (unchanged — icon bar already occupies 44px on mobile in the flex row).
- Refactoring the entire `ChatSidebar` state machine — only the collapse state (`rightSidebarOpen`/`toggleRightSidebar`) is removed.
- Changing the panel resize/drag behavior.
- Adding a new E2E smoke test for the right sidebar (optional, can be done later).

## 3. Files to Change

### Source files (3)

| File | Change |
|------|--------|
| `RightSidebarIconBar/index.tsx` | Delete `RightSidebarToggleButton` component entirely (60 lines). Remove `SidebarSimple` import. Remove the divider line. Keep only the 7-panel icon rail. |
| `Sidebars.jsx` | Always render `<RightSidebarIconBar />` (no more conditional). Remove `RightSidebarToggleButton` import. Simplify panel condition from `rightSidebarOpen && activeSidebar` → `activeSidebar`. |
| `ChatSidebar/index.tsx` | Remove `rightSidebarOpen` state, `toggleRightSidebar` function, and `localStorage` persistence effect. Remove both from context provider value. |

### Test files (2 — NOT 3)

| File | Change |
|------|--------|
| `RightSidebarIconBar/index.test.jsx` | Remove toggle-specific tests (3 tests + mock cleanup). Update button count from 8→7. |
| `Sidebars.test.jsx` | Rewrite 2 collapsed-state tests. Remove `rightSidebarOpen` from all mock return values. Remove `RightSidebarToggleButton` from mocks. |

> **Correction:** `ChatSidebar/index.test.jsx` does **NOT** test `rightSidebarOpen`/`toggleRightSidebar` — it only tests `activeSidebar`, panel toggling, `openPreview`, and `consoleLogs`. No changes needed there.

## 4. Detailed Change Plan

### 4.1 `RightSidebarIconBar/index.tsx`

**Current state (lines 1–150):**
```tsx
import { SidebarSimple, Eye, FolderOpen, ... } from "@phosphor-icons/react";
// ...
export function RightSidebarToggleButton() {
  // 38 lines: button with aria-expanded, aria-controls, tooltip, SidebarSimple icon
}
export default function RightSidebarIconBar() {
  return (
    <div className="... w-[44px]">
      <RightSidebarToggleButton />
      <div className="w-6 h-px ..." />  {/* divider */}
      {icons.map(...)}  {/* 7 panel icons */}
    </div>
  );
}
```

**New state:**
- Delete `RightSidebarToggleButton` function entirely (lines 21–60).
- Remove `SidebarSimple` from the import (it was only used by the toggle).
- Remove the divider `<div>` (lines 119–120).
- Keep `useTranslation` import (used by icon labels).
- Keep the 7-panel icon rail unchanged (lines 121–147).

**Net diff:** ~60 lines deleted, 2 lines modified (import, divider).

### 4.2 `Sidebars.jsx`

**Current state:**
```jsx
import RightSidebarIconBar, {
  RightSidebarToggleButton,
} from "./RightSidebarIconBar";
// ...
const { rightSidebarOpen, activeSidebar } = useChatSidebar();

return (
  <div ...>
    {rightSidebarOpen && activeSidebar && (
      <div style={{ width: PANEL_W }} ...>
        {/* panel content */}
      </div>
    )}
    {rightSidebarOpen ? (
      <RightSidebarIconBar />
    ) : (
      <div className="... w-[44px] ...">  {/* collapsed column */}
        <RightSidebarToggleButton />
      </div>
    )}
  </div>
);
```

**New state:**
```jsx
import RightSidebarIconBar from "./RightSidebarIconBar";
// (RightSidebarToggleButton import removed)
// ...
const { activeSidebar } = useChatSidebar();  // rightSidebarOpen removed

return (
  <div ...>
    {activeSidebar && (
      <div style={{ width: PANEL_W }} ...>
        {/* panel content — unchanged */}
      </div>
    )}
    <RightSidebarIconBar />  {/* always rendered */}
  </div>
);
```

**Key changes:**
1. Remove `RightSidebarToggleButton` from named import.
2. Destructure only `activeSidebar` from `useChatSidebar()`.
3. Panel condition: `rightSidebarOpen && activeSidebar` → `activeSidebar`.
4. Icon bar: remove conditional — always `<RightSidebarIconBar />`.
5. Remove the entire collapsed column else-branch.

### 4.3 `ChatSidebar/index.tsx`

**Current state (relevant parts):**
```tsx
// Line 57 — state
const [rightSidebarOpen, setRightSidebarOpen] = useState(() => {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem("openafd_right_sidebar_open");
    return stored !== null ? stored === "true" : true;
  } catch { return true; }
});

// Lines 99–106 — localeStorage persistence
useEffect(() => {
  try {
    localStorage.setItem("openafd_right_sidebar_open", String(rightSidebarOpen));
  } catch {}
}, [rightSidebarOpen]);

// Lines 123–125 — function
function toggleRightSidebar() {
  setRightSidebarOpen((prev: boolean) => !prev);
}

// Lines 140–141 — context value
value={{
  // ... other values ...
  rightSidebarOpen,
  toggleRightSidebar,
  // ...
}}
```

**New state:**
- Remove lines 56–65 (`rightSidebarOpen` state with `localStorage` init).
- Remove lines 99–106 (`localStorage` persistence effect).
- Remove lines 123–125 (`toggleRightSidebar` function).
- Remove `rightSidebarOpen` and `toggleRightSidebar` from the context `value` object.
- All other state, functions, and context values remain untouched.
- No other components/hooks in this file depend on `rightSidebarOpen` (verified: `useSourcesSidebar`, `useMemoriesSidebar`, `usePreviewSidebar`, `useConsoleSidebar`, `useFilesystemSidebar`, `useDatabaseSidebar`, `usePoliticalSidebar` all use only `activeSidebar`, not `rightSidebarOpen`).

## 5. Test Plan

### 5.1 Unit tests: `RightSidebarIconBar/index.test.jsx`

**Tests to REMOVE (4):**

```js
// Line 30–34: button count is now 7, not 8
it("renders all 8 icon buttons (collapse + 7 panels)", () => { ... });

// Lines 36–43: toggle button no longer exists
it("calls toggleRightSidebar when the collapse icon is clicked", () => { ... });

// Lines 71–77: toggle button no longer exists
it("has aria-expanded on the toggle button reflecting sidebar state", () => { ... });

// Lines 79–86: toggle button no longer exists
it("has aria-controls pointing to the sidebar panel", () => { ... });
```

**Tests to ADD (1):**

```js
it("renders 7 panel icon buttons", () => {
  const { container } = render(<RightSidebarIconBar />);
  const buttons = container.querySelectorAll("button");
  expect(buttons.length).toBe(7);
});
```

**Mock cleanup:**
- Remove `mockToggleRightSidebar` variable (line 13).
- Remove `rightSidebarOpen` and `toggleRightSidebar` from the mock return value (lines 20–21).

**Tests that stay unchanged (3):**
- "calls toggleSidebar with 'preview' when preview icon clicked"
- "calls toggleSidebar with 'database' when database icon clicked"
- "has accessible labels on every button (a11y)"

### 5.2 Unit tests: `Sidebars.test.jsx`

**Tests to REWRITE (2):**

1. **"renders nothing in panel area when sidebar is closed"** (lines 85–95)
   - Before: checks `rightSidebarOpen: false, activeSidebar: "sources"` → panel hidden, toggle visible
   - After: remove `rightSidebarOpen` from mock; the panel should always show when `activeSidebar` is set. Rewrite to verify that with `activeSidebar: null`, no panel is rendered.

2. **"renders toggle button in collapsed mode without icon bar"** (lines 97–107)
   - Before: checks `rightSidebarOpen: false, activeSidebar: null` → only toggle button
   - After: this test no longer applies (no toggle state). Rewrite as: "icon bar is always visible regardless of activeSidebar".

**Tests to update mock values (5):**
All existing tests pass `rightSidebarOpen: true` in the mock return value. Remove this line from:
- "renders the active panel when sidebar is open with activeSidebar" (line 61)
- "renders nothing in panel area when no activeSidebar" (line 71)
- "panel width is 360px when shown" (line 111)
- All 7 `it.each` panel tests (line 129)

**Mock cleanup:**
- Remove `RightSidebarToggleButton` from the mock (lines 47–49).

### 5.3 Unit tests: `ChatSidebar/index.test.jsx`

**No changes needed.** This file only tests `activeSidebar`, `openSidebar`, `closeSidebar`, `toggleSidebar`, `openPreview`, `consoleLogs`, and the specialized hooks (`useDatabaseSidebar`, `usePoliticalSidebar`). None of these tests assert `rightSidebarOpen` or `toggleRightSidebar`.

### 5.4 E2E test

- `frontend/tests/e2e/upload-attachment.spec.js` does not interact with the right sidebar → passes unchanged.
- Optional (future): add a smoke check that the right icon bar is visible with the expected icons.

### 5.5 Manual verification

1. Open the chat page on desktop (`sinchat.delqhi.com`).
2. Confirm the right icon bar is visible immediately with all 7 icons and no toggle icon.
3. Click each panel icon — the corresponding panel opens.
4. Click the same icon again — the panel closes (toggle behavior).
5. Check browser console — no errors.
6. Resize to mobile width — layout should be unchanged from current behavior (icon bar already takes 44px on mobile).

## 6. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Layout shift on desktop (icon bar now always 44px) | **None** | Low | The 44px is already the default when expanded. No width change occurs. |
| Test mocks still provide `rightSidebarOpen`/`toggleRightSidebar` | **High** (without careful mock cleanup) | Low | Precisely documented which mocks need updating. Run tests before commit to catch any missed occurrences. |
| `PreviewSidebar/index.test.jsx` breaks (it mocks `useChatSidebar` independently) | **None** (verified) | — | The mock only returns `openPreview: vi.fn()`. No `rightSidebarOpen` reference. |
| E2E test breaks due to unexpected UI change | **None** | — | The E2E test targets the upload flow, not the right sidebar. Run it after changes to confirm. |
| Mobile layout breaks | **None** | — | The icon bar already occupies 44px on mobile in the flex row. This is unchanged. |
| `localStorage` key `openafd_right_sidebar_open` becomes orphaned | Low | **None** | The key is simply ignored. No functional impact. Optional cleanup on mount. |
| Unused `SidebarSimple` import causes ESLint warning | **Medium** | Low | Remove it as part of the changes. Verified in plan. |
| `ChatSidebar/index.test.jsx` tests break unexpectedly | **None** (verified) | — | Confirmed: no test in that file references `rightSidebarOpen` or `toggleRightSidebar`. |

## 7. Verification Steps (must all pass before merge)

1. **`npm run build`** in `frontend/` → 0 errors.
2. **`npm run test -- --run RightSidebarIconBar`** → all remaining tests pass (7 button count, 2 click tests, 1 a11y test).
3. **`npm run test -- --run Sidebars`** → all rewritten tests pass.
4. **`npm run test -- --run ChatSidebar`** → all tests pass (should be identical to before).
5. **`npm run test -- --run src/components/WorkspaceChat/ChatContainer/PromptInput src/components/WorkspaceChat/ChatContainer/ChatHistory`** → 231 tests pass (no regression broad sweep).
6. **`./node_modules/.bin/playwright test tests/e2e/upload-attachment.spec.js`** → 1 passed.
7. **Manual desktop check** at `https://sinchat.delqhi.com/`:
   - Icon bar visible with all 7 icons and no toggle icon.
   - Panels open/close via icon clicks.
8. **`curl -s -o /dev/null -w '%{http_code}' https://sinchat.delqhi.com/`** → `200` after redeploy.

## 8. Rollback Plan

If anything breaks after deployment:

1. `git revert <commit>` to revert the entire changeset.
2. Rebuild the frontend with `npm run build` in `frontend/`.
3. Recreate the Docker image: copy new `frontend/dist` into `opensin-app:v0.56.3` as `opensin-app:v0.56.4` (same procedure used for deployment).
4. Run `docker compose up -d opensin-chat` from `docker/` directory.
5. Verify `curl -s -o /dev/null -w '%{http_code}' https://sinchat.delqhi.com/` returns `200`.
6. Verify the toggle icon is back and the collapse/expand behavior works as before.

## 9. Acceptance Criteria

- [ ] The toggle icon at the top of the right icon bar is removed.
- [ ] All panel icons in the right icon bar are always visible on desktop.
- [ ] Clicking a panel icon opens the corresponding panel.
- [ ] Clicking the same icon again or the panel close button closes the panel.
- [ ] All affected unit tests pass.
- [ ] The existing E2E upload test passes.
- [ ] Frontend build succeeds.
- [ ] Deployed `sinchat.delqhi.com` returns 200 and shows the always-visible icon bar.
- [ ] Mobile layout is not broken.
