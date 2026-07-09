# Bug Index — OpenSIN Chat

**Generated:** 2026-07-09
**Repo:** https://github.com/OpenSIN-AI/OpenSIN-Chat
**Version audited:** v1.14.0 (commit `c82494f74`)

This directory contains 30 bugs found during a comprehensive audit of the OpenSIN Chat codebase. Bugs are grouped by severity and category. Each bug document includes:
- File path and line number
- Current state (code snippet)
- Problem description
- Desired state
- Exact fix (copy-paste ready)
- Verification steps

## Quick Reference

| # | Severity | Category | File | One-line summary |
|---|----------|----------|------|------------------|
| 1 | 🔴 CRITICAL | Build | `docker/Dockerfile:17` | Invalid SHA256 placeholder `<DIGEST>` breaks build |
| 2 | 🔴 CRITICAL | Deploy | `docker/docker-compose.yml:83` | `itzcrazykns1337/vane:v1.0.0` tag doesn't exist on Docker Hub |
| 3 | 🔴 CRITICAL | Security | `docker/Dockerfile:91`, `cloud-deployments/openshift/Dockerfile:85` | Chromium downloaded without SHA256 verification |
| 4 | 🟠 HIGH | Branding | 10+ files | Wrong GitHub org `Family-Team-Projects` in user-facing strings |
| 5 | 🟡 MEDIUM | Branding | `server/utils/boot/patchSdkTimeouts.js` | `ANYTHINGLLM_*` env vars still in code |
| 6 | 🟢 LOW | Branding | `server/utils/files/logo.js` | Legacy `anythingllm-logo.png` filenames (intentional shim) |
| 7 | 🟢 LOW | Branding | `docker/.env.example`, `server/.env.example` | `docs.anythingllm.com` URLs |
| 8 | 🟡 MEDIUM | Security | `docker/Dockerfile:91` | `webassets.anythingllm.com` CDN URL |
| 9 | 🟢 LOW | Branding | `server/.env.example:265` | `LLM_PROVIDER='anythingllm-router'` |
| 10 | 🟢 LOW | Branding | `collector/utils/runtimeSettings/index.js:55` | Wrong org in code comment |
| 11 | 🟠 HIGH | Security | `collector/index.js:36` | CORS allows any origin (`origin: true`) |
| 12 | 🟡 MEDIUM | Reliability | `server/app.js:72-79` | `process.exit(1)` on uncaughtException kills in-flight requests |
| 13 | 🟡 MEDIUM | Security | `server/models/workspaceNote.js`, `server/utils/parseJobs/index.js` | `$queryRawUnsafe` (low risk, code smell) |
| 14 | 🟡 MEDIUM | Observability | 30+ files | Empty `catch {}` blocks swallow errors |
| 15 | 🟡 MEDIUM | Security | `frontend/.../PromptReply/index.tsx:241` | `dangerouslySetInnerHTML` (likely safe, needs review) |
| 16 | 🟢 LOW | Security | `collector/middleware/verifyIntegrity.js` | Dev bypass env var (safe by design) |
| 17 | 🟢 LOW | Cosmetic | `docker/docker-healthcheck.sh:62` | Misleading indentation |
| 18 | 🟡 MEDIUM | Deploy | `docker/docker-compose.yml:8-10` | External network `haus-netzwerk` may not exist |
| 19 | 🟢 LOW | Deploy | `docker/Dockerfile` HEALTHCHECK | `docker-healthcheck.sh` may not be copied into image |
| 20 | 🟢 LOW | Hygiene | 5 files | Empty placeholder files keep reappearing |
| 21 | 🟢 LOW | Docs | `.pcpm/rules.md` | Redacted/empty placeholders in rules |
| 22 | 🟢 LOW | Observability | 107 sites in `server/` | `console.*` instead of `consoleLogger.*` |
| 23 | 🟢 LOW | Repo size | `frontend/public/embed/opensin-chat-widget.min.js` | 715KB minified bundle in repo |
| 24 | 🟡 MEDIUM | Memory leak | 3 files | `setInterval` without cleanup in React components |
| 25 | 🟡 MEDIUM | Memory leak | 5 files | `addEventListener` without cleanup |
| 26 | 🟢 LOW | Docs | 30+ files | TODO/FIXME without issue links |
| 27 | 🟢 LOW | Branding | `collector/utils/extensions/AfDPresse/` | Party-specific extension in neutral project |
| 28 | 🟢 LOW | Migration | `frontend/src/utils/constants.ts:19-43` | Legacy `openafd_*` keys without removal date |
| 29 | 🟢 LOW | Confusing | `docker/docker-compose.yml:32-33` | Both `image:` and `build:` specified |
| 30 | 🟢 LOW | Deploy | `docker/fix-permissions.sh` | Only fixes `server/storage`, not `collector/*` |

## Severity Counts

- 🔴 CRITICAL: 3 (all break build/deploy)
- 🟠 HIGH: 2 (user-facing branding + CORS)
- 🟡 MEDIUM: 9 (security, reliability, memory leaks)
- 🟢 LOW: 16 (hygiene, docs, cosmetic)

## Recommended Fix Order

### Phase 1: Unblock build/deploy (do today)
1. **Bug #1** — Replace `<DIGEST>` placeholder in Dockerfile
2. **Bug #2** — Fix `vane:v1.0.0` → `vane:latest`
3. **Bug #3** — Add SHA256 verification for Chromium (or self-host)

### Phase 2: User-facing branding (do this week)
4. **Bug #4** — Global `Family-Team-Projects` → `OpenSIN-AI` replace
5. **Bug #7** — Replace `docs.anythingllm.com` URLs in env examples
6. **Bug #9** — Replace `anythingllm-router` in env example

### Phase 3: Security hardening (do this sprint)
11. **Bug #11** — Fix collector CORS
12. **Bug #12** — Fix `process.exit(1)` on uncaughtException
13. **Bug #13** — Migrate `$queryRawUnsafe` → `$queryRaw`
14. **Bug #14** — Add ESLint rule + bulk-fix empty catches
15. **Bug #15** — Verify and tighten XSS sanitization

### Phase 4: Reliability (do next sprint)
18. **Bug #18** — Make `haus-netzwerk` network optional
19. **Bug #19** — Verify `docker-healthcheck.sh` is copied into image
24. **Bug #24** — Add `clearInterval` cleanup
25. **Bug #25** — Add `removeEventListener` cleanup

### Phase 5: Hygiene (do as time permits)
20, 21, 22, 23, 26, 27, 28, 29, 30

## How to Use This Document

Each bug file contains:
- **Severity** — How bad is it?
- **File** — Exact location
- **Current state** — The buggy code
- **Problem** — Why it's broken
- **Desired state** — What it should look like
- **Fix** — Copy-paste ready command or code
- **Verification** — How to confirm the fix worked

To create GitHub issues from these bugs, copy each section into `.github/ISSUE_TEMPLATE/audit-finding.yml` format.

## Files in This Directory

- `README.md` — This index
- `01_CRITICAL_BUGS.md` — Bugs #1-3 (build/deploy breaking)
- `02_BRANDING_BUGS.md` — Bugs #4-10 (wrong references)
- `03_SECURITY_BUGS.md` — Bugs #11-19 (security + deploy)
- `04_CODE_QUALITY_BUGS.md` — Bugs #20-30 (hygiene + memory leaks)
