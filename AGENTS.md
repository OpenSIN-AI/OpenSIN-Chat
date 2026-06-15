<!-- SPDX-License-Identifier: MIT -->

# OpenSIN-Chat — Agent Context

> Project-specific guidance for AI agents working on OpenSIN-Chat.
> For the full SIN-Code Tool Suite rules, see the global `~/.config/opencode/AGENTS.md`.

## Project Identity

- **Name:** OpenSIN-Chat
- **Origin:** MIT-licensed fork of [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) by Mintplex Labs
- **Domain:** Self-hosted AI workspace for political research, knowledge management, and assisted chat
- **Brand:** OpenSIN-AI (primary wordmark, color `#009ee0`)
- **Telemetry:** Completely disabled — no PostHog, no Mintplex CDN, no analytics

## Architecture

```text
OpenSIN-Chat/
├── frontend/          Vite + React 18 + TypeScript + Tailwind + i18next
├── server/            Node.js + Express + Prisma + SQLite (dev) / Postgres (prod)
├── collector/         Python service for document ingestion and OCR
├── docker/            Docker / Compose setup
├── cloud-deployments/ AWS, GCP, Azure, DO, Helm, OpenShift stubs
├── docs/              Architecture, ADRs, plans, runbooks
└── tests/             E2E and integration tests
```

## Key Commands

| Task | Command |
|---|---|
| Install | `yarn install` (root, server, frontend) |
| Dev server | `yarn dev:server` + `yarn dev:frontend` |
| Build | `yarn build` |
| Lint | `yarn lint:check` |
| Tests | `yarn test` (frontend), `yarn test:server` (server) |
| Bundle check | `yarn check:bundle` |

## Working Rules

1. **Always use SIN-Code tools first** (`sin_discover`, `sin_grasp`, `sin_scout`, `sin_execute`, `sin_map`, etc.) instead of OpenCode built-ins.
2. **On macOS, use OrbStack (`orb`)**, never `docker`.
3. **CoDocs standard:** every meaningful code file needs a `.doc.md` companion and a `Purpose` + `Docs:` header.
4. **No direct `main` mutations** — edits go through normal branch/PR workflow unless explicitly told otherwise.
5. **Keep minimal changes** — preserve existing logic and style.
6. **Brand guard:** never re-introduce `AnythingLLM` or `Mintplex Labs` strings outside allowed files (see `scripts/check-branding.sh`).

## Active Planning Documents

- [`PLAN.md`](./PLAN.md) — short-term priorities
- [`docs/PLAN-PRODUCTION-READINESS.md`](./docs/PLAN-PRODUCTION-READINESS.md) — mid-to-long-term roadmap
- [`ROADMAP.md`](./ROADMAP.md) — GSD-style phase overview

## Backlog & Issues

- [`BACKLOG.md`](./BACKLOG.md) — archived; active work is in the plans above
- GitHub Issues: all currently closed

## Deployment

- Production: `https://sinchat.delqhi.com` (Cloudflare Tunnel)
- Container images: `ghcr.io/opensin-ai/opensin-chat`
- Deployment guide: [`docs/OPENSIN-CHAT-DEPLOYMENT.md`](./docs/OPENSIN-CHAT-DEPLOYMENT.md)

## Credits

Original codebase by [Mintplex Labs Inc.](https://github.com/Mintplex-Labs) — used under MIT license.
