# usePoliticianSync.doc.md

## What

React hook that fetches and caches politician statistics and sync status via SWR for the admin dashboard.

## Dependencies

- `swr` — data fetching and caching
- `@/utils/constants` — `API_BASE` URL
- `frontend/src/pages/Admin/PoliticianSync/index.tsx` — primary consumer
- `frontend/src/hooks/usePoliticianSync.test.tsx` — unit tests

## Config values & limits

- `refreshInterval: 30000` — polls both endpoints every 30 seconds
- `revalidateOnFocus: true` — refreshes when the tab regains focus
- Endpoints: `GET /api/politician/stats` and `GET /api/politician/sync/status`

## Why

SWR provides stale-while-revalidate behavior so the dashboard shows cached data immediately while refreshing in the background. Polling keeps the sync status roughly live without manual refreshes.

## Usage

```tsx
const { stats, syncStatus, isLoading, error, mutate } = usePoliticianSync();
```

## Caveats

- Returns `null` for `stats` and `syncStatus` while loading or on error.
- Errors are not automatically retried beyond SWR's built-in behavior; callers should use `mutate()` to manually refresh.
- Credentials are included in fetch requests, so the API session must be valid.
