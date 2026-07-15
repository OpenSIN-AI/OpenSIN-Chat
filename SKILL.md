# OpenSIN-Chat Agent Skill

Compact, validated operating procedures for agents working on the OpenSIN-Chat repository (self-hosted AI chat platform for political research, knowledge management, and assisted chat).

## Core Identity
- **Project**: OpenSIN-Chat (MIT)
- **Brand**: OpenSIN-AI (#009ee0)
- **Stack**: Vite/React/TS/Tailwind frontend + Node/Express/Prisma server + Python collector + Docker/OrbStack
- **Telemetry**: Disabled (no PostHog, Mintplex, analytics)

## Non-Negotiables (SACRED)
1. **VERIFY BEFORE YOU CLAIM**: Never report success without end-to-end execution + visible proof (run commands, click flows, take evidence). If you cannot verify, explicitly say so.
2. **Use SIN-Code tools first**: Prefer `sin_discover`, `sin_grasp`, `sin_scout`, `sin_execute`, `sin_map` over built-in agent tools.
3. **OrbStack on macOS**: Always use `orb` (never bare `docker`).
4. **CoDocs**: Every meaningful code file gets a `.doc.md` companion with Purpose + Docs: header.
5. **No direct main mutations**: All changes via normal branch/PR unless explicitly authorized.
6. **Brand guard**: Never reintroduce "AnythingLLM" or "Mintplex Labs" strings outside approved files (see `scripts/check-branding.sh`).
7. Keep changes minimal. Preserve existing logic and style.

## Architecture Essentials
- frontend/: React 18 + TS + Tailwind + i18next
- server/: Node + Express + Prisma (SQLite dev, Postgres prod)
- collector/: Python (ingestion + OCR)
- docker/ + docker-opensin/
- Key commands: `yarn install`, `yarn dev:server` + `yarn dev:frontend`, `yarn build`, `yarn lint:check`, `yarn test`, `yarn test:server`

## Working Process
- Read project AGENTS.md + relevant docs/ before changes.
- Follow GSD-style planning when applicable.
- Use worktrees via Orca when doing parallel work.
- For agent skills/memory: Prefer validated, compact SKILL.md updates via review/adopt flow.

## Deployment & Ops
- Prod: https://sinchat.delqhi.com (Cloudflare Tunnel)
- Images: ghcr.io/opensin-ai/opensin-chat
- See docs/OPENSIN-CHAT-DEPLOYMENT.md and docs/PLAN-SCALE-DEPLOY-GUIDE.md

## Skill Evolution
This SKILL.md (and AGENTS.md) is intended to be optimized with SkillOpt + SkillOpt-Sleep.
- Use `skillopt-sleep run --project . --backend <claude|codex|...>` to evolve.
- Review proposals with `status`, adopt with `adopt`.
- Prefer bounded, validated edits only.
- Nightly cron can be installed via `skillopt-sleep schedule`.

## Preferences (for Sleep reflection)
- Keep skills compact, actionable, and auditable.
- Prioritize verification, minimal diffs, and SIN-Code tool usage.
- Preserve brand and CoDocs standards.
