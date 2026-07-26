# Handoff for ChatGPT Web Session

## Session State

- **Date**: 2026-07-25
- **Local Agent**: opencode/mimo-v2.5-free
- **Worktree**: /Users/jeremy/dev/OpenSIN-Chat
- **Sister Repo**: /Users/jeremy/dev/OpenAfD-Chat
- **ChatGPT Profile**: OpenSIN (bba91bb2-87b8-419a-8928-771ac370526e)
- **Mac i9 Connector**: Available at http://127.0.0.1:8080/readyz

## Current Status

### Completed by Local Agent
- Both repos clean (no uncommitted changes)
- Both repos on main branch
- Type-check passed for both repos
- Both repos live: sinchat.delqhi.com and openafd.delqhi.com
- Orca browser opened with ChatGPT in OpenSIN profile
- sin-gpt-web taskplan initialized

### Browser Issue
- `orca fill` fills the ChatGPT textbox but send button doesn't activate
- `orca type` doesn't trigger input events in ChatGPT's ProseMirror editor
- `computer type-text` can't focus Orca window
- **Workaround needed**: User may need to manually paste the delegation message or use ChatGPT API

## Tasks for ChatGPT Web (Priority Order)

### T-0002: Security P0 - Remove Public Operational Data [CRITICAL]
- Remove VM IPs, SSH users, internal ports, container hostnames from public repo
- Check git history for leaked secrets
- Files to check: docker-compose.yml, docs/, scripts/, README.md
- Acceptance: No production credentials in public repo

### T-0003: Security P0 - Docker Security Hardening [CRITICAL]
- Remove SYS_ADMIN capability from docker-compose.yml
- Add cap_drop: ALL, security_opt: no-new-privileges
- Bind ports to 127.0.0.1 instead of 0.0.0.0
- Acceptance: Docker Compose hardened

### T-0004: CI/CD - Real GitHub Actions [HIGH]
- Create .github/workflows/ci.yml with lint, typecheck, tests, build
- Create .github/workflows/ceo-audit.yml
- Acceptance: Real CI checks running

### T-0005: CI/CD - Immutable Docker Images [HIGH]
- Tag Docker builds with commit SHA
- Update docker-compose to use image tags
- Acceptance: No more docker cp in production

### T-0006: Product - Remove Video Generation [HIGH]
- Remove video generation mode from UI and backend
- Remove cvoice celebrity voices
- Acceptance: Clean product focus

### T-0007: Product - Focus Navigation [HIGH]
- Reduce navigation to 6 items: Chats, Sources, Political Data, Research, Reports, Admin
- Move rest to Lab section
- Acceptance: Simplified navigation

### T-0011: Oracle Cloud VM [CRITICAL]
- Verify VM reachable (SSH timed out but web services work)
- Check Docker containers running latest code
- Update containers if needed
- Acceptance: VM healthy, sinchat.delqhi.com working

### T-0012: Sync OpenAfD-Chat [HIGH]
- Sync OpenAfD-Chat with OpenSIN-Chat changes
- Push to GitHub
- Acceptance: Both repos in sync

### T-0013: Browser Test All Functions [HIGH]
- Test: Web search, file upload, source files, chat functions
- Document all bugs found
- Acceptance: Complete test report

### T-0008-0010: Repo Cleanup [MEDIUM]
- Archive outdated docs
- Update README
- Unify toolchain

## Verification Commands

```bash
# After each task
yarn type-check
yarn lint:ci
yarn test

# For both repos
cd /Users/jeremy/dev/OpenSIN-Chat && yarn type-check
cd /Users/jeremy/dev/OpenAfD-Chat && yarn type-check
```

## Completion

Use `sin-gpt-web-state complete` to mark tasks done:
```bash
sin-gpt-web-state --repo /Users/jeremy/dev/OpenSIN-Chat complete T-0002 --owner chatgpt-web --evidence "description of what was done" --actor chatgpt-web
```
