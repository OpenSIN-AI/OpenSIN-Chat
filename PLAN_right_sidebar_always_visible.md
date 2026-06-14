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
- Remove the toggle icon from the right sidebar icon bar.
- Keep the 44px icon bar always rendered.
- Preserve the panel open/close behavior driven by individual panel icons.
- Update affected unit tests and the E2E upload test if needed.
- Verify build, unit tests, and E2E tests still pass.

### Out of scope
- Changing the left sidebar.
- Changing mobile behavior beyond what naturally follows from the CSS (`hidden md:flex` already hides the toggle on mobile).
- Refactoring the entire `ChatSidebar` state machine — only the collapse state is removed.

## 3. Files to Change

### Source files

| File | Change |
|------|--------|
| `frontend/src/components/WorkspaceChat/ChatContainer/RightSidebarIconBar/index.tsx` | Remove `RightSidebarToggleButton` export and the divider line. Keep only the icon rail. |
| `frontend/src/components/WorkspaceChat/ChatContainer/Sidebars.jsx` | Always render `<RightSidebarIconBar />` instead of conditionally showing only the toggle button. Remove the import of `RightSidebarToggleButton`. |
| `frontend/src/components/WorkspaceChat/ChatContainer/ChatSidebar/index.tsx` | Remove `rightSidebarOpen` state, `setRightSidebarOpen`, `toggleRightSidebar`, the `localStorage` persistence for `openafd_right_sidebar_open`, and remove both values from the context provider. Panel state (`activeSidebar`) remains untouched. |

### Test files

| File | Change |
|------|--------|
| `frontend/src/components/WorkspaceChat/ChatContainer/RightSidebarIconBar/index.test.jsx` | Remove the test that clicks the collapse toggle. Remove `rightSidebarOpen` and `toggleRightSidebar` from the mock if they are no longer used. |
| `frontend/src/components/WorkspaceChat/ChatContainer/Sidebars.test.jsx` | Remove or rewrite the collapsed-state tests. The component should now always render the icon bar. |
| `frontend/src/components/WorkspaceChat/ChatContainer/ChatSidebar/index.test.jsx` | Remove tests asserting `rightSidebarOpen` / `toggleRightSidebar`. Keep all panel-related tests. |

## 4. Detailed Change Plan

### 4.1 `RightSidebarIconBar/index.tsx`

**Current behavior:**
- Exports `RightSidebarToggleButton` which consumes `rightSidebarOpen` and `toggleRightSidebar` from `useChatSidebar`.
- The default `RightSidebarIconBar` renders the toggle button, a divider, and then the panel icons.

**New behavior:**
- Delete the `RightSidebarToggleButton` component entirely.
- Remove the divider (`<div className="w-6 h-px ..." />`).
- The icon bar renders only the panel icons.
- Remove the import of `useTranslation` if it is no longer used (check after removing toggle — it is still used by the icon labels, so keep it).
- Keep the existing `activeSidebar`/`toggleSidebar` logic and all icon definitions.

### 4.2 `Sidebars.jsx`

**Current behavior:**
```jsx
{rightSidebarOpen ? (
  <RightSidebarIconBar />
) : (
  <div className="... w-[44px] ...">
    <RightSidebarToggleButton />
  </div>
)}
```

**New behavior:**
```jsx
<RightSidebarIconBar />
```

- Remove the `RightSidebarToggleButton` import.
- Remove the conditional block; always render the full icon bar.
- The panel area (`rightSidebarOpen && activeSidebar && ...`) can be simplified to `activeSidebar && ...` because the sidebar is always considered open. However, since the provider will no longer expose `rightSidebarOpen`, we can just check `activeSidebar`.

### 4.3 `ChatSidebar/index.tsx`

**Current behavior:**
- Maintains `rightSidebarOpen` state, initialized from `localStorage`, persisted back to `localStorage`.
- Exposes `rightSidebarOpen` and `toggleRightSidebar` in context.

**New behavior:**
- Remove `rightSidebarOpen` state and `setRightSidebarOpen`.
- Remove the `useEffect` that persists to `localStorage`.
- Remove `toggleRightSidebar` function.
- Remove both from the context provider value object.
- Keep `activeSidebar`, `sidebarData`, `openSidebar`, `closeSidebar`, `toggleSidebar`, `sourceFilter`, `setSourceFilter`, `previewData`, `openPreview`, `consoleLogs`, and `clearConsoleLogs` unchanged.
- Optionally remove the `openafd_right_sidebar_open` value from existing users’ `localStorage` by deleting it on mount (nice-to-have, not required).

## 5. Test Plan

### 5.1 Unit tests to update / run

1. `frontend/src/components/WorkspaceChat/ChatContainer/RightSidebarIconBar/index.test.jsx`
   - Remove the test: *"calls toggleRightSidebar when the collapse icon is clicked"*.
   - Ensure the remaining tests still verify the icon bar renders the correct number of icons and handles clicks.

2. `frontend/src/components/WorkspaceChat/ChatContainer/Sidebars.test.jsx`
   - Remove tests that assert the collapsed view only shows the toggle button.
   - Add/update a test asserting the icon bar is always rendered regardless of `rightSidebarOpen` (which will be removed from mocks).
   - Keep tests verifying the panel is shown/hidden based on `activeSidebar`.

3. `frontend/src/components/WorkspaceChat/ChatContainer/ChatSidebar/index.test.jsx`
   - Remove tests for `rightSidebarOpen` and `toggleRightSidebar`.
   - Keep tests for `activeSidebar`, `toggleSidebar`, `openPreview`, etc.

### 5.2 E2E test

- `frontend/tests/e2e/upload-attachment.spec.js` does not interact with the right sidebar, so it should continue to pass unchanged.
- Add a visual smoke check in the existing E2E test or a separate short E2E test: after navigation, the right icon bar is visible and contains at least the expected icons (e.g., Vorschau, Verzeichnis, Politiker-Datenbank). This is optional but recommended for confidence.

### 5.3 Manual verification

1. Open the chat page on desktop.
2. Confirm the right icon bar is visible immediately with all icons.
3. Confirm there is **no** collapse/expand icon at the top.
4. Click each icon — the corresponding panel opens.
5. Click the same icon again — the panel closes.
6. Resize the browser to mobile width — the icon bar should still be hidden on mobile (the original `hidden md:flex` on the toggle is gone, but the entire rail is normally hidden on mobile by the parent layout; verify this).
7. Check that no console errors occur.

## 6. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Layout shift on desktop because the icon bar now always consumes 44px | Low | Low | The 44px width is already the default when the sidebar was open. Only the collapsed 44px-only state changes. |
| Tests fail because mocks still provide `rightSidebarOpen`/`toggleRightSidebar` | Medium | Low | Update all affected mocks and tests before committing. |
| E2E test breaks due to unexpected UI change | Low | Medium | Run the existing E2E upload test; optionally add a right-sidebar smoke check. |
| Mobile layout breaks because the icon bar is now always rendered | Low | Medium | Verify mobile behavior manually. The original `Sidebars` component is typically hidden on mobile via parent layout, but confirm. |
| `localStorage` key `openafd_right_sidebar_open` becomes orphaned | Low | Low | Optional cleanup: delete the key on provider mount. No functional impact if left. |

## 7. Verification Steps (must all pass before merge)

1. `npm run build` in `frontend/` completes without errors.
2. `npm run test -- --run src/components/WorkspaceChat/ChatContainer/RightSidebarIconBar` passes.
3. `npm run test -- --run src/components/WorkspaceChat/ChatContainer/Sidebars` passes.
4. `npm run test -- --run src/components/WorkspaceChat/ChatContainer/ChatSidebar` passes.
5. `./node_modules/.bin/playwright test tests/e2e/upload-attachment.spec.js` passes.
6. Manual desktop check: icon bar always visible, toggle icon gone, panels open/close correctly.
7. Manual mobile check: no regression on mobile layout.
8. `curl -s -o /dev/null -w '%{http_code}' https://sinchat.delqhi.com/` returns `200` after redeploy.

## 8. Rollback Plan

If anything breaks after deployment:

1. Revert the three source code files and the test files.
2. Rebuild the frontend.
3. Recreate the Docker image `opensin-app:v0.56.4` (or bump to `v0.56.5`) with the reverted frontend dist.
4. Restart the container and verify `https://sinchat.delqhi.com/` returns `200`.
5. Optionally restore `localStorage` behavior if the revert needs it.

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
