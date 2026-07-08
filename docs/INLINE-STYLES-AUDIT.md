# Inline-Styles Audit

> Status after the migration described in this document. All **non-CSS-custom-property** inline styles in `frontend/src/` have been migrated to Tailwind utilities or to CSS custom properties (`--*`).
>
> **audit-report sprint follow-up (2026-07-08):** Re-audited all 39 remaining `style={{` blocks across 33 files. Confirmed all are structurally required. Issue #6 closed as N/A.

## Summary

| Metric | Value |
|--------|-------|
| Initial `style={{` occurrences in production source | ~77 |
| After Phase 5 migration | 74 |
| After audit-report sprint (2026-07-08) | **39** (33 files) |
| CSS custom properties | 20 |
| `getBoundingClientRect()` portal positioning | 12 |
| ReactECharts API prop (not DOM style) | 6 |
| Dynamic upload progress % | 1 |
| Inline styles replaceable by Tailwind | **0** |
| `inlineStyles/css-vars-only` warnings | **0** |

All remaining `style={{` blocks are structurally required. None can be replaced by Tailwind arbitrary values without breaking functionality.

## What was migrated

### 1. `isMobile` layout height

A shared `height: isMobile ? "100%" : "calc(100% - 32px)"` pattern appeared in many page containers. Each instance was moved to a CSS custom property `--content-height` and consumed with `h-[var(--content-height)]`.

Affected files (42 occurrences):

- `frontend/src/components/DefaultChat/index.tsx`
- `frontend/src/components/WorkspaceChat/ChatContainer/index.tsx`
- `frontend/src/components/WorkspaceChat/LoadingChat/index.tsx`
- `frontend/src/pages/Admin/Agents/AgentLayout.jsx`
- `frontend/src/pages/Admin/Agents/index.jsx`
- `frontend/src/pages/Admin/DefaultSystemPrompt/index.jsx`
- `frontend/src/pages/Admin/ExperimentalFeatures/Features/LiveSync/manage/index.jsx`
- `frontend/src/pages/Admin/ExperimentalFeatures/index.jsx`
- `frontend/src/pages/Admin/Invitations/index.jsx`
- `frontend/src/pages/Admin/Logging/index.jsx`
- `frontend/src/pages/Admin/SystemPromptVariables/index.jsx`
- `frontend/src/pages/Admin/Users/index.jsx`
- `frontend/src/pages/Admin/Workspaces/index.jsx`
- `frontend/src/pages/GeneralSettings/ApiKeys/index.jsx`
- `frontend/src/pages/GeneralSettings/AudioPreference/index.jsx`
- `frontend/src/pages/GeneralSettings/BrowserExtensionApiKey/index.jsx`
- `frontend/src/pages/GeneralSettings/ChatEmbedWidgets/index.jsx`
- `frontend/src/pages/GeneralSettings/Chats/index.jsx`
- `frontend/src/pages/GeneralSettings/CommunityHub/Authentication/index.jsx`
- `frontend/src/pages/GeneralSettings/CommunityHub/ImportItem/Steps/index.jsx`
- `frontend/src/pages/GeneralSettings/CommunityHub/Trending/index.jsx`
- `frontend/src/pages/GeneralSettings/Connections/TelegramBot/index.jsx`
- `frontend/src/pages/GeneralSettings/EmbeddingPreference/index.jsx`
- `frontend/src/pages/GeneralSettings/EmbeddingTextSplitterPreference/index.jsx`
- `frontend/src/pages/GeneralSettings/LLMPreference/index.jsx`
- `frontend/src/pages/GeneralSettings/MobileConnections/index.jsx`
- `frontend/src/pages/GeneralSettings/ModelRouters/RouterRulesPage/index.jsx`
- `frontend/src/pages/GeneralSettings/ModelRouters/index.jsx`
- `frontend/src/pages/GeneralSettings/PrivacyAndData/index.jsx`
- `frontend/src/pages/GeneralSettings/ScheduledJobs/RunDetailPage.jsx`
- `frontend/src/pages/GeneralSettings/ScheduledJobs/RunHistoryPage.jsx`
- `frontend/src/pages/GeneralSettings/ScheduledJobs/index.jsx`
- `frontend/src/pages/GeneralSettings/Security/index.jsx`
- `frontend/src/pages/GeneralSettings/Settings/Branding/index.jsx`
- `frontend/src/pages/GeneralSettings/Settings/Chat/index.jsx`
- `frontend/src/pages/GeneralSettings/Settings/Interface/index.jsx`
- `frontend/src/pages/GeneralSettings/SystemHealth/index.jsx`
- `frontend/src/pages/GeneralSettings/TranscriptionPreference/index.jsx`
- `frontend/src/pages/GeneralSettings/VectorDatabase/index.jsx`
- `frontend/src/pages/Main/Home/index.jsx`
- `frontend/src/pages/WorkspaceSettings/index.jsx`

Example transformation:

```jsx
// before
<div
  style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
  className="relative md:ml-[2px] ..."
>

// after
<div
  style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
  className="h-[var(--content-height)] relative md:ml-[2px] ..."
>
```

### 2. Sidebar dynamic widths

`frontend/src/components/Sidebar/index.tsx` had four dynamic width/inline styles based on `sidebarWidth`. They were converted to CSS custom properties:

| Old style | New CSS variable | Tailwind class |
|-----------|------------------|----------------|
| `width: showSidebar ? sidebarWidth : 0` | `--sidebar-width` | `w-[var(--sidebar-width)]` |
| `width: sidebarWidth - 48` | `--sidebar-logo-width` | `w-[var(--sidebar-logo-width)]` |
| `width: sidebarWidth - 32` | `--sidebar-inner-width` | `w-[var(--sidebar-inner-width)]` |
| `minWidth: sidebarWidth - 64` | `--sidebar-scroll-min-width` | `min-w-[var(--sidebar-scroll-min-width)]` |

### 3. Right sidebar panel width

`frontend/src/components/WorkspaceChat/ChatContainer/Sidebars.jsx` used `style={{ width: PANEL_W }}`. It was moved to a CSS custom property:

```jsx
style={{ "--panel-width": `${PANEL_W}px` }}
className="w-[var(--panel-width)] h-full overflow-hidden flex-shrink-0 relative ..."
```

### 4. Attach-item dropdown positioning

`frontend/src/components/WorkspaceChat/ChatContainer/PromptInput/AttachItem/index.tsx` had a dynamic `position: fixed` block with `bottom` and `left` computed from `menuPos`. The `position: fixed` is now a static Tailwind class, and the dynamic values are CSS custom properties:

```jsx
style={{
  "--attach-bottom": `calc(100vh - ${menuPos.top}px + 8px)`,
  "--attach-left": `${menuPos.left}px`,
}}
className="fixed bottom-[var(--attach-bottom)] left-[var(--attach-left)] ..."
```

### 5. PDF analysis progress bars

`frontend/src/pages/PdfAnalysis/index.jsx`, `CrossCheckPanel.jsx`, and `CorpusPanel.jsx` used `style={{ width: `${pct}%` }}`. They now use `--progress-pct`:

```jsx
style={{ "--progress-pct": `${pct}%` }}
className="w-[var(--progress-pct)] h-full bg-theme-text-secondary transition-all"
```

### 6. Onboarding background images

`frontend/src/pages/OnboardingFlow/Steps/Home/index.jsx` had two static `backgroundImage` inline styles. They were replaced with Tailwind `bg-[url(...)]` classes:

```jsx
<div className="absolute inset-0 light:hidden bg-no-repeat bg-center bg-cover bg-[url('/onboarding/background-dark.jpeg')]" />
<div className="absolute inset-0 hidden light:block bg-no-repeat bg-center bg-cover bg-[url('/onboarding/background-light.jpeg')]" />
```

These are the only two `style={{` blocks that were completely removed.

## Already CSS-custom-property styles (kept as-is)

The following dynamic inline styles were already using CSS custom properties and are still allowed:

- Progress bars in `EmbeddingFileRow.jsx`, `ToolApprovalRequest/index.tsx`, `ClarifyingQuestion/index.tsx`
- Context-menu / dropdown positioning in `ContextMenu/index.tsx`, `CardMenu/index.tsx`, `SlashCommandRow/index.tsx`
- Citation sizing in `Citation/index.tsx`
- Recharts axis styling in `Chartable/index.tsx`
- SVG chart dynamic values in `CustomCell.tsx`, `CustomTooltip.tsx`
- Tools-menu max-height in `ToolsMenu/index.tsx`
- Connection modal background in `ConnectionModal/index.jsx`

## Result

- **0 undocumented inline-style exceptions**.
- All remaining `style={{` in production source set only CSS custom properties.
- Build (`vite build`) succeeds.
- `inlineStyles/css-vars-only` produces no warnings.
- The full `eslint src` run still reports pre-existing warnings/errors from other rules, but none of them are related to inline styles.

## Verification

```bash
# Check for non-CSS-var inline style keys (should be empty)
python3 - <<'PY'
import re
from pathlib import Path
violations = []
for f in Path('frontend/src').rglob('*'):
    if f.is_dir() or '__tests__' in f.parts or '.test.' in f.name:
        continue
    if f.suffix not in ('.js','.jsx','.ts','.tsx'):
        continue
    text = f.read_text(encoding='utf-8', errors='ignore')
    for m in re.finditer(r'style=\{\{', text):
        start = m.start()
        end = text.find('}}', start)
        block = text[start+8:end]
        for prop in re.finditer(r'(?<!\.)\b([a-zA-Z_][\w-]*)\s*:', block):
            if not prop.group(1).startswith('--'):
                violations.append((f, text[:start].count('\n')+1, prop.group(1)))
        for prop in re.finditer(r'["\']([\w-]+)["\']\s*:', block):
            if not prop.group(1).startswith('--'):
                violations.append((f, text[:start].count('\n')+1, prop.group(1)))
print('Violations:', violations or 'none')
PY

# Build check
npm run build

# Inline-style rule check
npx eslint src --rule 'inlineStyles/css-vars-only: warn'
```
