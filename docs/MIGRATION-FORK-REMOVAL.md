# Migration Guide: Fork-Reference Removal

> **Purpose:** This document explains every change made in PR #572 of `OpenSIN-AI/OpenSIN-Chat`
> (branch `chore/remove-upstream-fork-references`, commit `12c51b3`) so that a local agent
> can apply the same pattern to the sister repository `Family-Team-Projects/OpenAfD-Chat`
> without guesswork.

## Context

Both `OpenSIN-Chat` and `OpenAfD-Chat` are sovereign, independent products by their respective
organizations. Both evolved from a shared architectural foundation (multiple open-source
projects, not just AnythingLLM) but are now >80% independent codebases.

The branding policy in both repos states: **"This is NOT a fork and should not be referred to
as such."** However, the main documentation files still contained "inspired by AnythingLLM",
"originally forked from", and "Mintplex Labs" references that contradict this policy.

PR #572 removes all such references from the **main documentation files** of `OpenSIN-Chat`
and consolidates upstream acknowledgments into a single dedicated file.

## Sister-Repo-Specific Notes

`OpenAfD-Chat` uses the **OpenAfD** brand instead of **OpenSIN**. The migration agent must
apply the following substitutions when porting these changes:

| OpenSIN-Chat | OpenAfD-Chat |
|---|---|
| `OpenSIN Chat` | `OpenAfD Chat` |
| `OpenSIN-AI` | `Family-Team-Projects` (or whatever org owns OpenAfD-Chat) |
| `OpenSIN` | `OpenAfD` |
| `opensin-chat` | `openafd-chat` |
| `CREDITS.md` | `CREDITS.md` (same filename) |
| `sinchat.delqhi.com` | `chat.opensin.ai` (or OpenAfD equivalent) |
| `support@sinchat.delqhi.com` | OpenAfD support email |

The existing `scripts/rebrand-opensin.sh` in both repos already handles most of these
substitutions. The migration agent should:

1. Apply PR #572 changes to `OpenAfD-Chat` first
2. Then run `scripts/rebrand-opensin.sh` (or its OpenAfD equivalent) to substitute brand names
3. Verify the result with the OpenAfD-Chat branding linter

---

## Files Changed (9 total)

### 1. `CREDITS.md` — NEW FILE

**Why:** All upstream acknowledgments (AnythingLLM, Mintplex Labs, Timothy Carambat, and
all third-party components) were scattered across `README.md`, `BRANDING.md`, `THIRD_PARTY.md`,
`CONTRIBUTING.md`, `AGENTS.md`, `SECURITY.md`, and `TERMS_SELF_HOSTED.md`. Consolidating them
into one file:

- Makes the main docs cleaner and more professional
- Eliminates the "fork" perception in user-facing documentation
- Preserves full attribution (required by MIT license)
- Gives future contributors one canonical place to look

**Sister-repo action:** Copy this file verbatim, then run the brand substitution script.

---

### 2. `README.md`

**Changes:**

| Line | Before | After |
|---|---|---|
| L42 | "A sovereign, independent product built by [OpenSIN-AI]... Originally inspired by AnythingLLM, OpenSIN Chat has evolved into..." | "A sovereign, independent product built by [OpenSIN-AI]... OpenSIN Chat is a purpose-built system for..." |
| L243-255 | Full "Credits" section with AnythingLLM/Mintplex/Carambat references | Single line linking to `CREDITS.md` |

**Why:** The README is the first thing every visitor, contributor, and potential customer
sees. "Inspired by AnythingLLM" in the opening paragraph immediately frames the project as
a fork, undermining the "sovereign, independent product" message. The detailed Credits
section reinforced this perception with quotes from AnythingLLM's own marketing copy.

**Sister-repo action:** Apply the same two replacements. The OpenAfD README has identical
structure (verified via `git log` history showing shared rebrand script).

---

### 3. `BRANDING.md`

**Changes:**

| Line | Before | After |
|---|---|---|
| L3 | "While it shares architectural foundations with earlier work, it is NOT a fork and should not be referred to as such." | (removed — replaced with simple "OpenSIN Chat is a sovereign, independent product by [OpenSIN-AI]") |
| L25 | "DB Provider Identifier: `anythingllm-router` (kept for database backward compatibility)" | (removed — internal DB identifier doesn't belong in branding policy) |
| L26 | "Third-party NPM Packages: `@mintplex-labs/*` remain unchanged where used" | Simplified to "upstream package scopes remain unchanged where used as-is" |
| L39-42 | Telemetry blocklist: "PostHog / Mintplex CDN / cdn.anythingllm.com / hub.anythingllm.com / docs.anythingllm.com" | Simplified to "NO outbound calls to third parties" with link to CREDITS.md |

**Why:** The branding policy should describe what the brand IS, not what it is NOT.
Defensive language ("NOT a fork", "should not be referred to as such") draws attention to
the very thing it's trying to deny. The telemetry blocklist naming specific upstream CDNs
also leaks the fork origin into the branding doc.

**Sister-repo action:** Apply the same simplifications. The OpenAfD BRANDING.md has the
same defensive structure.

---

### 4. `THIRD_PARTY.md`

**Changes:**

| Section | Before | After |
|---|---|---|
| Header | "OpenSIN Chat is a sovereign, independent AI platform (MIT-licensed). It builds on architectural foundations from earlier open-source work, which we gratefully acknowledge below." | "OpenSIN Chat is a sovereign, independent AI platform (MIT-licensed) by [OpenSIN-AI]. For acknowledgments of open-source projects that contributed to this codebase, see [CREDITS.md]." |
| Foundational Acknowledgments table | AnythingLLM + Mintplex Labs rows | (removed — moved to CREDITS.md) |
| Quote block | "We gratefully acknowledge Timothy Carambat..." | (removed — moved to CREDITS.md) |
| Third-Party NPM Packages | Mintplex packages with "actively maintained by the Mintplex team" note | (kept — these are real npm packages we use as-is) |

**Why:** `THIRD_PARTY.md` should list third-party COMPONENTS (libraries, data sources,
APIs), not credit upstream projects. Conflating the two dilutes the legal/practical
attribution (required for MIT compliance) with marketing-style "we stand on the shoulders
of giants" language.

**Sister-repo action:** Apply the same restructuring. Keep the `@mintplex-labs/*` package
list (these are real npm dependencies).

---

### 5. `CONTRIBUTING.md`

**Changes:**

| Section | Before | After |
|---|---|---|
| Brand Rules | "Never re-introduce `AnythingLLM` or `Mintplex Labs` strings outside allowed files" | "See [BRANDING.md] for full guidelines and [CREDITS.md] for upstream acknowledgments" |
| PR Guidelines #3 | "Run `./scripts/check-branding.sh` — it must pass (no `AnythingLLM` or `Mintplex Labs` strings in new code)" | "Run `./scripts/check-branding.sh` — it must pass (no upstream brand strings in new code)" |
| Brand guard section | "OpenSIN-Chat is an independent product inspired by AnythingLLM (MIT). Nearly 100% of the codebase has been rewritten or replaced. Never re-introduce `AnythingLLM` or `Mintplex Labs` strings..." | "OpenSIN-Chat is a sovereign, independent product by OpenSIN-AI. The branding check must pass before merge." |

**Why:** Contributors should follow the BRANDING policy, not memorize a list of forbidden
strings. Pointing them to the canonical docs (`BRANDING.md`, `CREDITS.md`) is more
maintainable than restating the rules in every contributing doc.

**Sister-repo action:** Apply the same three replacements.

---

### 6. `AGENTS.md`

**Changes:**

| Line | Before | After |
|---|---|---|
| L13 | "Telemetry: Completely disabled — no PostHog, no Mintplex CDN, no analytics" | "Telemetry: Completely disabled — no third-party analytics, no outbound tracking" |
| L46 | "Brand guard: never re-introduce `AnythingLLM` or `Mintplex Labs` strings outside allowed files" | "Brand guard: follow [BRANDING.md] and run `scripts/check-branding.sh` before any PR" |
| L67 | "Original codebase by [Mintplex Labs Inc.] — used under MIT license" | "OpenSIN-Chat is a sovereign, independent product by [OpenSIN-AI]. For acknowledgments, see [CREDITS.md]" |

**Why:** `AGENTS.md` is the project context file for AI coding agents. It should describe
the project's identity and rules, not its historical lineage. Agents reading this file
don't need to know the fork origin — they need to know the current brand and policies.

**Sister-repo action:** Apply the same three replacements.

---

### 7. `SECURITY.md`

**Changes:**

| Line | Before | After |
|---|---|---|
| L112 | "Zero telemetry — no PostHog, no Mintplex CDN, no analytics, no tracking of any kind" | "Zero telemetry — no third-party analytics, no outbound tracking, no tracking of any kind" |

**Why:** A security policy should describe the security posture, not name specific vendors.
"Zero telemetry" is the policy; the vendor list belongs in CREDITS.md.

**Sister-repo action:** Apply the same one-line replacement.

---

### 8. `TERMS_SELF_HOSTED.md`

**Changes:**

| Line | Before | After |
|---|---|---|
| L11 | "All upstream telemetry from the AnythingLLM base has been completely removed at the source level" | "All outbound telemetry has been completely removed at the source level" |
| L13 | "There are no connections to PostHog, Mintplex Labs, or any other third-party analytics provider" | "There are no connections to any third-party analytics provider" |

**Why:** Terms of service describe what the software does, not what it doesn't do relative
to a specific predecessor. Legal documents should be vendor-neutral.

**Sister-repo action:** Apply the same two replacements.

---

### 9. `scripts/check-branding.sh`

**Changes:**

Removed from `ALLOWED_FILES` whitelist (these files must now be free of upstream brand strings):
- `README.md`
- `BRANDING.md`
- `TERMS_SELF_HOSTED.md`
- `TERMS.md`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `SECURITY.md`

Added to `ALLOWED_FILES` whitelist:
- `CREDITS.md` (new canonical home for upstream acknowledgments)

**Why:** The CI linter enforces the branding policy. If main docs are in the whitelist,
contributors can accidentally re-introduce "AnythingLLM" references and CI won't catch it.
Removing them from the whitelist means **any future PR that adds "AnythingLLM" or
"Mintplex" to README, BRANDING, CONTRIBUTING, AGENTS, SECURITY, or TERMS_SELF_HOSTED will
fail CI** — preventing regression.

**Sister-repo action:** Apply the same whitelist changes. The OpenAfD-Chat linter has the
same structure.

---

## What Was NOT Changed (and Why)

These files remain in the linter whitelist because they have **functional or legal reasons**
to mention upstream names:

| File | Reason |
|---|---|
| `package.json` | `contributors[]` array credits Mintplex Labs (MIT license requires attribution) |
| `server/package.json`, `frontend/package.json`, `collector/package.json` | `@mintplex-labs/*` are published npm packages — cannot rename without forking and re-publishing |
| `server/index.js`, `server/app.js`, `server/utils/boot/index.js`, etc. | `require('@mintplex-labs/express-ws')` etc. — these are real upstream packages used as-is |
| `sbom/*.json`, `bom.json`, `sbom.spdx.json`, `sbom.cdx.json` | Auto-generated SBOM artifacts (CycloneDX/SPDX) — `purl` references must match package.json exactly |
| `scripts/upstream-sync/*` | Patch files must remain verbatim for `git am` to apply cleanly |
| `docs/UPSTREAM-SYNC.md` | Documents the snapshot-sync strategy from upstream |
| `docs/adr/*` | Architectural Decision Records reference upstream context |
| `server/utils/helpers/updateENV.js`, `dumpENV.js`, `patchSdkTimeouts.js`, `collectorApi/index.js` | Backward-compat: read `ANYTHINGLLM_*` env vars so existing AnythingLLM installations keep working |
| `server/utils/files/logo.js` | Backward-compat: accepts legacy `anythingllm-logo.png` filename |
| `frontend/src/models/system.ts`, `system.js`, `main.tsx`, `mocks/*` | Backward-compat: reads legacy `anythingllm_*` localStorage keys |
| `server/storage/README.md` | Docker exec commands reference upstream image |
| `frontend/public/embed/opensin-chat-widget.min.js` | Vendored embed widget (minified, cleaning tracked separately) |
| `LICENSE` | MIT license text |
| `docker/.env.example`, `server/.env.example` | Reference `docs.anythingllm.com` for upstream configuration docs (genuine link, not brand promotion) |
| `docker/Dockerfile`, `cloud-deployments/openshift/Dockerfile` | Download Chromium from `webassets.anythingllm.com` (factual dependency) |
| `cloud-deployments/helm/charts/opensin-chat/values.yaml`, `Chart.yaml` | Use `mintplexlabs/anythingllm` as OCI image repo |
| `server/endpoints/utils/terminalExec.js` | Redacts `/var/lib/anythingllm` from command output (backward-compat security redaction) |
| `collector/package.json` | `epub2: "git+https://github.com/Mintplex-Labs/epub2-static.git#main"` (upstream npm dep) |
| `frontend/src/utils/piperTTS/*` | `import '@mintplex-labs/piper-tts-web'` (upstream TTS engine) |
| `frontend/vite.config.js` | `manualChunks` regex matches `@mintplex-labs/{mdpdf,piper-tts-web}` for vendor-splitting |
| `server/__tests__/*` | Jest mocks reference real upstream module names |
| `scripts/upstream-sync/patches/06-ui-docs/0018-update-README.patch` | Verbatim upstream patch |
| `docs/changelog-recent.md` | Recent changelog entries reference upstream |
| `docs/abandoned-packages-audit.md` | Audit doc referencing upstream git deps |
| `docs/architecture.md` | SSoT architecture doc references upstream as context |
| `docs/vercel-deploy-fix.md` | References upstream as AnythingLLM-Fork context |
| `docs/ceo-audit-final.md`, `docs/CEO-AUDIT-REPORT.md` | Audit reports describe upstream lineage |
| `docs/admin/onboarding.md` | Onboarding doc references upstream |
| `server/PDF_ANALYSIS.md`, `server/app.doc.md` | Module docs credit upstream packages |
| `scripts/skill-oci-oracle-cloud-SKILL.md` | Skill doc references upstream |
| `RESEARCH.md`, `PRODUCTION-READINESS-REPORT.md` | Audit/comparison docs |
| `CEO-AUDIT-REPORT-2026-06-27.md`, `CEO-AUDIT-REPORT-2026-07-08.md` | CEO audit reports |
| `FUTURE-PLAN.md` | Future plan referencing upstream structural debt |
| `frontend/src/pages/Docs/content/*` | In-app docs mirror of `docs/` |
| `BRANDING.md` (old version) | Was in whitelist, now removed (see above) |
| `THIRD_PARTY.md` (old version) | Was in whitelist, now removed (see above) |
| `CONTRIBUTING.md` (old version) | Was in whitelist, now removed (see above) |
| `AGENTS.md` (old version) | Was in whitelist, now removed (see above) |
| `SECURITY.md` (old version) | Was in whitelist, now removed (see above) |
| `TERMS_SELF_HOSTED.md` (old version) | Was in whitelist, now removed (see above) |
| `TERMS.md` (old version) | Was in whitelist, now removed (see above) |
| `README.md` (old version) | Was in whitelist, now removed (see above) |

---

## Automated Migration Script

The local agent can run `scripts/migrate-fork-removal.sh` (included in this commit) to
apply all changes automatically. The script:

1. Creates `CREDITS.md` with the full upstream acknowledgment
2. Removes fork-references from all 7 main docs
3. Updates the CI linter whitelist
4. Runs `scripts/check-branding.sh` to verify
5. Reports any remaining issues

**Usage in OpenAfD-Chat:**

```bash
# 1. Copy the migration script and guide from OpenSIN-Chat
git fetch origin chore/remove-upstream-fork-references
git checkout chore/remove-upstream-fork-references -- docs/MIGRATION-FORK-REMOVAL.md scripts/migrate-fork-removal.sh

# 2. Apply to OpenAfD-Chat
cd /path/to/OpenAfD-Chat
bash scripts/migrate-fork-removal.sh

# 3. Run the brand substitution (OpenAfD → OpenSIN is the wrong direction; use the OpenAfD rebrand script)
bash scripts/rebrand-opensin.sh  # or the OpenAfD equivalent

# 4. Verify
bash scripts/check-branding.sh
```

---

## Verification Checklist

After migration, the local agent should verify:

- [ ] `CREDITS.md` exists and contains full upstream acknowledgments
- [ ] `README.md` has no "AnythingLLM", "Mintplex", "inspired by", "fork" strings
- [ ] `BRANDING.md` has no "AnythingLLM", "Mintplex" strings
- [ ] `CONTRIBUTING.md` has no "AnythingLLM", "Mintplex" strings
- [ ] `AGENTS.md` has no "AnythingLLM", "Mintplex" strings
- [ ] `SECURITY.md` has no "AnythingLLM", "Mintplex" strings
- [ ] `TERMS_SELF_HOSTED.md` has no "AnythingLLM", "Mintplex" strings
- [ ] `scripts/check-branding.sh` whitelist no longer includes main docs
- [ ] `scripts/check-branding.sh` whitelist includes `CREDITS.md`
- [ ] `scripts/check-branding.sh` passes (exit code 0)
- [ ] All other files in the whitelist still have valid reasons

---

## Rollback

If the migration causes issues, revert with:

```bash
git revert 12c51b3  # or the equivalent commit hash in OpenAfD-Chat
```

Or manually:

1. Delete `CREDITS.md`
2. Restore the old content of all 7 main docs from git history
3. Restore the old `scripts/check-branding.sh` whitelist

---

## Contact

If the local agent encounters issues during migration, check:

1. The PR diff: https://github.com/OpenSIN-AI/OpenSIN-Chat/pull/572
2. The commit: `12c51b3eff3cd6279de9b6719d5dd3d6a68cd779`
3. The branch: `chore/remove-upstream-fork-references`
4. This guide: `docs/MIGRATION-FORK-REMOVAL.md`
