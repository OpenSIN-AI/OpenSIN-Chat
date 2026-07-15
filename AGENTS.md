<!-- SPDX-License-Identifier: MIT -->

# OpenSIN-Chat — Agent Context

> Project-specific guidance for AI agents working on OpenSIN-Chat.
> For the full SIN-Code Tool Suite rules, see the global `~/.config/opencode/AGENTS.md`.

## Project Identity

- **Name:** OpenSIN-Chat
- **Status:** Sovereign, independent AI platform (MIT-licensed)
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
| SkillOpt-Sleep (dry-run) | `skillopt-sleep dry-run --project . --backend mock --progress` |
| SkillOpt-Sleep (full + adopt) | `skillopt-sleep run --project . --backend claude` then `skillopt-sleep adopt` |
| Schedule nightly auto-evolution | `skillopt-sleep schedule --project .` |

## Working Rules

1. **Always use SIN-Code tools first** (`sin_discover`, `sin_grasp`, `sin_scout`, `sin_execute`, `sin_map`, etc.) instead of OpenCode built-ins.
2. **On macOS, use OrbStack (`orb`)**, never `docker`.
3. **CoDocs standard:** every meaningful code file needs a `.doc.md` companion and a `Purpose` + `Docs:` header.
4. **No direct `main` mutations** — edits go through normal branch/PR workflow unless explicitly told otherwise.
5. **Keep minimal changes** — preserve existing logic and style.
6. **Brand guard:** never re-introduce `AnythingLLM` or `Mintplex Labs` strings outside allowed files (see `scripts/check-branding.sh`).
7. **VERIFY BEFORE YOU CLAIM (SACRED RULE).** An agent MUST NEVER report that something works, claim success, or end a task without first testing it end-to-end and seeing proof with its own eyes. "Testing" means: actually executing the flow, running the request, clicking the button, taking a screenshot, and confirming the expected result appeared. If the agent cannot test it (e.g. no browser available, no SSH access), the agent MUST explicitly say "I could not verify this — please test it yourself" instead of claiming it works. Claiming unverified success is the single most serious violation of trust an agent can commit. This rule overrides all other rules about brevity and conciseness.

## SkillOpt + SkillOpt-Sleep Integration (Full)

This repo is fully integrated with **SkillOpt** (text-space optimizer for agent skills) and **SkillOpt-Sleep** (nightly self-evolution from your own sessions).

- **Main skill artifact**: `SKILL.md` (compact, optimized procedures). AGENTS.md remains the full context.
- **Central source**: `/Users/jeremy/dev/SkillOpt` (source + plugins). CLI available globally via `skillopt-sleep`.
- **Infra stack integration**: Central management lives in `/Users/jeremy/dev/Infra-SIN-OpenCode-Stack` (skills, agent configs, Claude/Codex plugins, opencode wrappers). Changes here propagate to team agents.
- **Orca / worktrees**: Skills and .skillopt configs are part of the repo and travel with worktrees (amberjack, mola, etc.).
- **OpenCode**: Global skill + commands available via `~/.config/opencode/skills/skillopt-sleep`. Use in opencode sessions.
- **Claude Code + Codex**: Plugins + hooks from SkillOpt/plugins/{claude-code,codex} are reference-integrated. Use `/skillopt-sleep ...` (Claude) or equivalent in Codex. Cron + on-session hooks supported.
- **Automatic behavior**:
  - **Skill usage is automatic**: Once `SKILL.md` (or adopted best version) is in context / loaded by the agent (via system prompt, plugin, or explicit reference in AGENTS.md), the optimized procedures apply on every interaction without extra commands.
  - **Evolution (Sleep) is not fully automatic by default**: Run `skillopt-sleep run --project .` (or `dry-run`, `status`, `adopt`). Install nightly cron with `skillopt-sleep schedule --project .` (or use the scripts in SkillOpt/plugins/.../scripts/install-cron.sh). Hooks can trigger on session end.
  - In Claude Code: `/skillopt-sleep run`, `/skillopt-sleep adopt`, `/skillopt-sleep-handoff`.
  - Prefer `--backend claude` or `codex` (or local compatible) for real optimization. Start with `mock` or `dry-run`.
  - Proposals are **staged** (safe); explicit `adopt` applies with backup. Validation gate protects quality.

### Quick Commands (in this repo)
```bash
# Preview
skillopt-sleep dry-run --project . --backend mock --progress

# Full cycle (stages proposal)
skillopt-sleep run --project . --backend claude --source auto

# Review + adopt
skillopt-sleep status --project .
skillopt-sleep adopt --project .

# Schedule nightly (automatic evolution)
skillopt-sleep schedule --project .

# From source checkout if needed
cd /Users/jeremy/dev/SkillOpt && .venv/bin/python -m skillopt_sleep ...
```

See `/Users/jeremy/dev/SkillOpt/plugins/README.md` and docs/sleep/ for full details, backends, handoff mode, and preferences.

**For this repo + infra stack**: The SKILL.md + AGENTS.md are the primary targets for optimization. Run Sleep scoped to the project. Update central stack skills when patterns generalize.

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

Original codebase by [Mintplex Labs Inc.](https://github.com/Mintplex-Labs) — used under MIT license.
