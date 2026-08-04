# CEO Delegation Run 9

## Session identity

- Title: CEO-Runde Abschlussauftrag Run 9
- Source conversation URL: https://chatgpt.com/c/6a7125d6-5084-83eb-a182-746d87c353f4
- Current task: T-0018, plus every eligible or blocked task that can be advanced in both plans
- Repositories: `$REPO` and `$SISTER_REPO`
- Related tooling repository: `$TOOLING_REPO`
- Last status: Run 8 was blocked by Mac-i9 safety-filter/timeout and did not prove the remaining implementation, deployment, or browser gates. The local Chrome-first probe is now documented in wow-my-zsh Issue #29; use Orca only as the fallback.

## Mission

Act as the sovereign CEO and default implementation owner. Finish the user outcome, not merely the analysis:

1. Read and validate both `.sin-gpt-web/taskplan.sqlite3` plans and their generated `TASKPLAN.md` files before changing code.
2. Reconcile all open, blocked, and in-progress tasks with the current user request. Claim tasks atomically through `sin-gpt-web-state`; keep the plans current after every meaningful milestone.
3. Inspect both repositories for uncommitted changes, stale branches, drift, broken tests, security findings, and deploy mismatches. Preserve unrelated user changes and do not edit generated `TASKPLAN.md` manually.
4. Fix every technically actionable error in OpenSIN-Chat and OpenAfD-Chat, with the smallest safe changes. Prioritize completion, reliability, and existing product behavior over new features.
5. Run the relevant lint, typecheck, focused regressions, full tests, builds, branding/security/release checks, `git diff --check`, and `sin-gpt-web-state validate` in both repositories. Inspect results, do not trust claims.
6. Commit and push all reviewed intended changes to the correct GitHub `main` branches. Do not push secrets, local runtime state, screenshots, caches, or unrelated changes. Report exact commit SHAs and remote synchronization.
7. Deploy the exact reviewed main commits to the Oracle Cloud VM using the repository's documented safe workflow. Do not edit VM source files directly, delete either database, expose credentials, or use destructive Docker cleanup. Preserve rollback images and verify container health, permissions, internal health, public `/api/ping`, and both public domains.
8. Complete the browser acceptance on both live domains. Test login/re-login, normal chat, model selection, navigation, new/empty/error states, web search with visible result and sources, deep research with sources and clean terminal state, file upload, parsed content, adding source files to chat, original download, source drawer, notebooks, command-K search, reload persistence, reconnect/session termination, and relevant mobile/responsive states. Record exact fresh evidence for every result.
9. If a required action depends on a human-only portal login, missing credential, device, consent, production recording, or other external authority, do not simulate it. Record the blocker and exact next action in the correct SQLite plan, while completing all independent work.

## Tool and browser rules

- Use the Mac-i9 connector for every local read, write, shell command, test, Git operation, and deployment command. Do not merely describe commands.
- ChatGPT Web is the lead and writer. Do not delegate normal implementation to MiMo. MiMo is read-only unless a mechanically obvious, exact low-risk edit is explicitly scoped and independently reviewed.
- The sin-chrome check was attempted first. `sin-chrome doctor`, tunnel readiness, and the initial status were healthy, but after opening a second authenticated ChatGPT tab `sin-chrome-control tab-open` returned success and the following `status` and `snapshot` timed out. This is documented in wow-my-zsh Issue #29. Do not retry the unstable Chrome path for project delegation; use the authenticated Orca `OpenSIN` profile and fresh snapshots with stable page IDs.
- Never use Work mode or a logged-out/fresh profile. Verify the account menu, normal Chat mode, and the Mac-i9 connector before submitting work.
- The source conversation must be branched before this round. Verify the new canonical URL and short title first; archive the source only after branch and title verification. Record both title and URL in the OpenSIN handoff and, where applicable, the OpenAfD handoff. Never archive a working source chat on a failed branch.
- Do not close or control unrelated ChatGPT tabs. Close only the project delegation tab after callback and independent verification.
- Never paste, print, log, commit, or send credentials, tokens, cookie values, tunnel JSON, or private keys. Use secure existing mechanisms and redact evidence.

## Completion contract

Before the final callback, update both SQLite task plans and generated reports through `sin-gpt-web-state`, including every remaining blocker and exact evidence. Then send the callback for T-0018 with factual status, changed files, commit SHAs, tests, deployment health, browser evidence, and next action. Do not report success if any acceptance gate is unverified.
