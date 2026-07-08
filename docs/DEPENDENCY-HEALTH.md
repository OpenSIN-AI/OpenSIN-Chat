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
| `@tremor/react@3.18.7` | Dead — 0 imports. Requires Tailwind v3, conflicts with Tailwind v4. | **Remove** via `cd frontend && yarn remove @tremor/react` |
| `recharts-to-png@2.3.1` | Dead — 0 imports. | **Remove** via `cd frontend && yarn remove recharts-to-png` |
| `react-confetti-explosion@3.0.3` | Dead — 0 imports. | **Remove** via `cd frontend && yarn remove react-confetti-explosion` |

These removals are safe and eliminate the Tailwind v3/v4 peer conflict warning.
They are tracked as P2 items and can be done as a standalone chore commit.

## Maintenance

Re-run the report periodically (or via the CEO-Audit workflow) and update the
table above when a dependency's status changes.
