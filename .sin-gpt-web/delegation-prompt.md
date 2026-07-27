# Delegation Prompt for ChatGPT Web

## Context

- Repository: <repo-root>
- Sister Repo: <sister-repo-root>
- Both repos are clean (no uncommitted changes), type-check passed, on main
- Both are live: sinchat.delqhi.com and openafd.delqhi.com
- Task plan: .sin-gpt-web/TASKPLAN.md and taskplan.sqlite3

## Your Role

You are the sovereign project lead. Use Mac i9 for all local reads/writes/shell commands.

## Tasks to Complete (Priority Order)

### T-0002: Security P0 - Remove Public Operational Data
- Remove VM IPs, SSH users, internal ports, container hostnames, production paths from public repo
- Check git history for leaked secrets
- Acceptance: No production credentials in public repo, git history scanned

### T-0003: Security P0 - Docker Security Hardening
- Remove SYS_ADMIN capability
- Add cap_drop ALL, no-new-privileges
- Bind ports to 127.0.0.1
- Acceptance: Docker Compose hardened, no SYS_ADMIN, secure port binding

### T-0004: CI/CD - Real GitHub Actions
- Implement lint, typecheck, tests, build in real GitHub Actions workflows
- Acceptance: ceo-audit.yml, tests.yml exist and run real checks

### T-0005: CI/CD - Immutable Docker Images with Commit-SHA
- Tag Docker builds with Commit-SHA
- No more docker cp in production containers
- Acceptance: Image tagged with SHA, deployment uses only images

### T-0006: Product - Remove Video Generation and cvoice
- Remove video generation mode from standard product
- Remove cvoice celebrity voices completely
- Acceptance: No video generation in main menu, no celebrity TTS

### T-0007: Product - Radically Focus Navigation
- Only: Chats/Projects, Sources/Documents, Political Data, Research, Reports, Admin
- Rest under Lab/removed
- Acceptance: Primary navigation has only 6 entries

### T-0011: Oracle Cloud VM Check and Update
- VM reachable, Docker containers running with latest code
- sinchat.delqhi.com reachable
- Acceptance: VM healthy, containers updated

### T-0012: Sync OpenAfD-Chat Repository
- OpenAfD-Chat has same state as OpenSIN-Chat
- All changes pushed
- Acceptance: Both repos in sync

### T-0013: Browser Test All Functions
- Test: Web search, file upload, source files, chat functions
- Acceptance: All functions tested and documented

### T-0008-0010: Repo Cleanup
- Archive outdated documents
- Update README and branding
- Unify toolchain

## Verification

After each task:
- Run `yarn type-check` in both repos
- Run `yarn lint:ci` in both repos
- Run `yarn test` in both repos

## Completion

Update taskplan.sqlite3 with `sin-gpt-web-state complete` for finished tasks.
