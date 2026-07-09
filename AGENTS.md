<!-- SPDX-License-Identifier: MIT -->

# OpenSIN-Chat — Agent Context

> Project-specific guidance for AI agents working on OpenSIN-Chat.
> For the full SIN-Code Tool Suite rules, see the global `~/.config/opencode/AGENTS.md`.

## Project Identity

- **Name:** OpenSIN-Chat
- **Status:** Sovereign, independent AI platform (MIT-licensed)
- **Domain:** Self-hosted AI workspace for political research, knowledge management, and assisted chat
- **Brand:** OpenSIN-AI (primary wordmark, color `#009ee0`)
- **Telemetry:** Completely disabled — no third-party analytics, no outbound tracking

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
6. **Brand guard:** follow [`BRANDING.md`](./BRANDING.md) and run `scripts/check-branding.sh` before any PR.
7. **VERIFY BEFORE YOU CLAIM (SACRED RULE).** An agent MUST NEVER report that something works, claim success, or end a task without first testing it end-to-end and seeing proof with its own eyes. "Testing" means: actually executing the flow, running the request, clicking the button, taking a screenshot, and confirming the expected result appeared. If the agent cannot test it (e.g. no browser available, no SSH access), the agent MUST explicitly say "I could not verify this — please test it yourself" instead of claiming it works. Claiming unverified success is the single most serious violation of trust an agent can commit. This rule overrides all other rules about brevity and conciseness.

## Active Planning Documents

- [`ROADMAP.md`](./ROADMAP.md) — GSD-style phase overview (all 10 phases complete; historical archive)
- [`docs/MAJOR-UPGRADE-PLAN.md`](./docs/MAJOR-UPGRADE-PLAN.md) — future major version upgrade research (React 19, Prisma 7, Tailwind 4)
- [`docs/PLAN-SCALE-DEPLOY-GUIDE.md`](./docs/PLAN-SCALE-DEPLOY-GUIDE.md) — production deployment guide (Docker Compose, Helm, Redis, CDN)

## Backlog & Issues

- GitHub Issues: all currently closed

## Deployment

- Production: `https://sinchat.delqhi.com` (Cloudflare Tunnel)
- Container images: `ghcr.io/opensin-ai/opensin-chat`
- Deployment guide: [`docs/OPENSIN-CHAT-DEPLOYMENT.md`](./docs/OPENSIN-CHAT-DEPLOYMENT.md)

## Credits

OpenSIN-Chat is a sovereign, independent product by [OpenSIN-AI](https://github.com/OpenSIN-AI).
For acknowledgments of open-source projects that contributed to this codebase, see
[`CREDITS.md`](./CREDITS.md).
