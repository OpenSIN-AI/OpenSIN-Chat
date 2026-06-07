# server/utils/backgroundJobs/jobs/generateTitle.js

## What it does
Generates a short (≤5 words) thread title in the user's language by calling
the same LLM provider the workspace uses (via `resolveProviderConnector`).
Falls back to `WorkspaceThread.defaultName` ("Thread") on empty/clean failure.

## Touched by
- **Dispatcher:** `server/utils/backgroundJobs/queue.js`
  (case `GENERATE_THREAD_TITLE` in `_executeJob`)

## Payload contract
```js
{
  threadId:       Number,  // WorkspaceThread.id
  workspaceSlug:  String,  // Workspace.slug
  prompt:         String,  // First user message of the thread
  response:       String,  // First assistant response
}
```

## Skip conditions
- Thread has already been renamed (not `defaultName` anymore)
- Thread or Workspace not found → job throws → queue retries

## Failure modes
| Error | Behavior |
|---|---|
| Missing payload field | Job fails immediately, stored in `last_error` |
| LLM connector resolves to `null` | Job fails (provider misconfig) |
| Empty LLM response | Falls back to `defaultName` (no throw) |
| LLM API timeout/5xx | Throws → queue retries up to `max_attempts=3` |
