# index.doc.md (Admin/PoliticianSync)

## What

Admin page for monitoring politician sync health, viewing per-source status, and triggering manual sync runs.

## Dependencies

- `frontend/src/hooks/usePoliticianSync` — stats and sync status hook
- `frontend/src/components/SettingsSidebar` — layout sidebar
- `frontend/src/components/lib/CTAButton` — manual sync button
- `@phosphor-icons/react` — status icons
- `react-loading-skeleton` — loading placeholders
- `frontend/src/main.tsx` — route registration
- `frontend/src/pages/Admin/PoliticianSync/index.test.tsx` — tests

## Config values & limits

- `isMobile` from `react-device-detect` switches the content height to `100%` on mobile.
- Skeleton placeholders use `var(--theme-bg-secondary)` and `var(--theme-bg-primary)`.
- Manual sync posts to `POST /api/politician/sync/trigger`.

## Why

Politician data is synced from external sources on a schedule; this page gives operators a dedicated view without mixing it into general workspace settings.

## Usage

```tsx
// Registered in frontend/src/main.tsx as an admin route
const { default: PoliticianSync } = await import("@/pages/Admin/PoliticianSync");
<AdminRoute Component={PoliticianSync} />
```

## Caveats

- Status strings (`completed`, `ok`, `failed`, `running`) are rendered with hard-coded badge colors.
- Error messages are truncated to two lines in source cards.
- The retry queue table only renders when `retryQueue` is non-empty.
