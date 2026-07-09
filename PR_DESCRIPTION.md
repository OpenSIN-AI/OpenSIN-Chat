# PR: Fix CI lint errors and implement per-connector polling

## Summary
This PR resolves the failing **PR Lint & Test** workflow (#74) and implements the long-standing TODO in TriggerEngine.

## Files changed
- 6 frontend components (removed duplicate aria-label attributes)
- server/utils/agents/triggerEngine.js (delegates to new pollers module)
- server/utils/agents/triggerPollers.js (NEW: gmail, github, rss/atom, webhook)
- server/__tests__/agents/triggerPollers.test.js (NEW: 9 unit tests)

## Verification
- ESLint: 0 errors (was 8)
- Jest triggerPollers: 9/9 pass
- Jest triggerEngine: 9/9 pass (no regression)
