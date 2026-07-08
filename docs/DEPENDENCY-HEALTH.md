# Dependency Health Report

This document records the resolution of the CEO-Audit findings for
potentially abandoned / deprecated dependencies (GitHub issue #5) and the
tooling introduced to keep dependency health visible over time.

## Tooling

`scripts/dependency-health.cjs` queries the npm registry for every direct
dependency across the `root`, `server`, `frontend`, and `collector`
workspaces. It reports:

- the latest published version and its publish date,
- whether the installed range resolves to a **deprecated** release,
- packages whose latest release is **stale** (no publish within N years,
  default 2).

Run it locally:

```bash
node scripts/dependency-health.cjs --years 2
```

In CI it runs in report-only mode so a flaky registry never breaks a build.

## Findings & Resolutions (2026-06-06)

The audit flagged **3** deprecated/abandoned packages.

| Package | Status | Resolution |
| --- | --- | --- |
| `react-beautiful-dnd@13.1.1` | Deprecated, unmaintained | **Replaced** with `@hello-pangea/dnd@^18.0.1`, the community-maintained drop-in fork with an identical API. Both import sites migrated. |
| `elevenlabs@^0.5.0` | Deprecated (package renamed) | **Replaced** with `@elevenlabs/elevenlabs-js@^2.51.0`. The TTS module was migrated to the v2 client API (`textToSpeech.convert()` + web-stream buffering). |
| `@langchain/community` | Latest release is also deprecated | **Accepted finding.** Deprecation is ecosystem-wide across the LangChain JS packages; no non-deprecated successor exists yet. Tracked here and revisited when LangChain publishes a stable replacement. |

## CEO Audit Follow-up (2026-07-08)

The 2026-07-08 CEO Audit Sprint confirmed 3 additional dead packages with 0 imports:

| Package | Status | Action |
| --- | --- | --- |
| `@tremor/react@3.18.7` | Dead — 0 imports. Required Tailwind v3, conflicted with v4. | **Removed** (already absent from `frontend/package.json`) |
| `recharts-to-png@2.3.1` | Dead — 0 imports. | **Removed** (already absent from `frontend/package.json`) |
| `react-confetti-explosion@3.0.3` | Dead — 0 imports. | **Removed** (already absent from `frontend/package.json`) |

All three were already absent from `package.json` before the sprint. Confirmed via `yarn remove` (no-op). Tailwind v3/v4 peer conflict is resolved.

## localStorage Key Rebrand (2026-07-08)

All `anythingllm_*` localStorage keys have been fully migrated to `opensin_*`.
The fallback read paths (`safeGetItem("anythingllm_*")`) that were previously
kept for backwards compatibility are now removed:

| File | Key removed |
| --- | --- |
| `frontend/src/main.tsx` | `anythingllm_pdf_mock`, `anythingllm_ws_mock` |
| `frontend/src/mocks/browser.ts` | `anythingllm_ws_mock` |
| `frontend/src/models/system.js` | `anythingllm_disable_onboarding` |
| `frontend/src/mocks/auditHandlers.ts` | comment updated |
| `frontend/src/mocks/pdfAnalysisHandlers.ts` | comment updated |

Any existing `anythingllm_*` entries in a user's browser localStorage are now
inert. Users who previously used these dev flags must re-set them with the
`opensin_*` prefix.

## Maintenance

Re-run the report periodically (or via the CEO-Audit workflow) and update the
table above when a dependency's status changes.
