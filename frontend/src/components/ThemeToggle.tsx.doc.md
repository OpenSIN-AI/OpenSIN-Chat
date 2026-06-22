# ThemeToggle

**Purpose:** Renders a small icon button that cycles the application theme through `light` → `dark` → `system`.

**Docs:** [ThemeToggle.tsx](ThemeToggle.tsx), [ThemeContext.tsx](../ThemeContext.tsx), [Sidebar/index.tsx](Sidebar/index.tsx)

## What this file does

- Wraps `useThemeContext()` to read the current theme and the `setTheme` setter.
- Renders nothing when the context is missing (e.g. no `ThemeProvider`) so the application does not crash.
- Shows a `Moon` icon when the resolved theme is light and a `Sun` icon when the resolved theme is dark.
- Clicking the button advances to the next theme in the order `light` → `dark` → `system` → `light`.
- Sets `aria-label` and `title` to a translated string composed of `common.theme` plus the label for the next theme (`common.themeDark`, `common.themeLight`, or `common.themeSystem`).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | Optional Tailwind class string. When provided, it replaces the default button styling; otherwise the rounded, transparent hover style from the Sidebar is used. |

## Usage

```tsx
import ThemeToggle from "@/components/ThemeToggle";

// Default styling
<ThemeToggle />

// Custom styling
<ThemeToggle className="p-2 rounded-full bg-slate-800 hover:bg-slate-700" />
```

## Known caveats

- The component is intentionally a default export so it can be imported with a simple name.
- It does not provide its own tooltip; consumers can wrap it in a tooltip or rely on the `title` attribute.
- The i18n key for the next theme is built dynamically, so all three `common.themeLight`, `common.themeDark`, and `common.themeSystem` keys must exist in the translation files.
