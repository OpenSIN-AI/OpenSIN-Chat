# Contributing to OpenSIN-Chat

OpenSIN-Chat is an open-source project and we welcome contributions from the community.

## Reporting Issues

If you encounter a bug or have a feature request, please open an issue on the
[GitHub issue tracker](https://github.com/OpenSIN-AI/OpenSIN-Chat).

## Picking an issue

We track issues on the GitHub issue tracker. If you are looking for something to
work on, check the [good first issue](https://github.com/OpenSIN-AI/OpenSIN-Chat/contribute) label. These issues are typically the best described and have the smallest scope. There may be issues that are not labeled as good first issue, but are still a good starting point.

If there's an issue you are interested in working on, please leave a comment on the issue. This will help us avoid duplicate work. Additionally, if you have questions about the issue, please ask them in the issue comments. We are happy to provide guidance on how to approach the issue.

## Before you start

Keep in mind that we are a small team and have limited resources. We will do our best to review and merge your PRs, but please be patient. Ultimately, **we become the maintainer** of your changes. It is our responsibility to make sure that the changes are working as expected and are of high quality as well as being compatible with the rest of the project both for existing users and for future users & features.

Before you start working on an issue, please read the following so that you don't waste time on something that is not a good fit for the project or is more suitable for a personal fork. We would rather answer a comment on an issue than close a PR after you've spent time on it. Your time is valuable and we appreciate your time and effort to make OpenSIN-Chat better.

0. (most important) If you are making a PR that does not have a corresponding issue, **it will not be merged.** _The only exception to this is language translations._

1. If you are modifying the permission system for a new role or something custom, you are likely better off forking the project and building your own version since this is a core part of the project and is only to be maintained by the OpenSIN-Chat team.

2. Integrations (LLM, Vector DB, etc.) are reviewed at our discretion. We will eventually get to them. Do not expect us to merge your integration PR instantly since there are often many moving parts and we want to make sure we get it right. We will get to it!

3. It is our discretion to merge or not merge a PR. We value every contribution, but we also value the quality of the code and the user experience we envision for the project. It is a fine line to walk when running a project like this and please understand that merging or not merging a PR is not a reflection of the quality of the contribution and is not personal. We will do our best to provide feedback on the PR and help you make the changes necessary to get it merged.

4. **Security** is always important. If you have a security concern, please do not open an issue. Instead, please open a CVE on our designated reporting platform [Huntr](https://huntr.com) or contact us at [support@sinchat.delqhi.com](mailto:support@sinchat.delqhi.com).

## Configuring Git

First, fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/<username>/OpenSIN-Chat.git
cd OpenSIN-Chat
```

Then add the main repository as a remote:

```bash
git remote add upstream https://github.com/OpenSIN-AI/OpenSIN-Chat.git
git fetch upstream
```

## Development Setup

### Requirements

- **Node.js**: v18+ required
- **Package manager**: `yarn` ONLY — never use `npm`
- **Docker**: Use OrbStack on macOS (`orb` CLI, not `docker`). On Linux, use Docker directly.

### Installation

Run `yarn install` in three locations:

```bash
yarn install        # root
cd server && yarn install && cd ..
cd frontend && yarn install && cd ..
```

Alternatively, run `yarn setup` from the root which installs dependencies, sets up ENV files, and runs the Prisma setup script.

### Commands

| Task | Command |
|------|---------|
| Install all | `yarn install` (root, server, frontend) |
| Dev server | `yarn dev:server` + `yarn dev:frontend` |
| Dev (all) | `yarn dev:all` |
| Build | `yarn build` |
| Lint | `yarn lint:check` |
| Frontend tests | `yarn test` (frontend) |
| Server tests | `yarn test:server` (server) |
| Bundle check | `yarn check:bundle` |
| Branding check | `./scripts/check-branding.sh` |

## Coding Standards

1. **No comments in code** — unless absolutely necessary for complex logic
2. **CoDocs standard** — every meaningful code file should have a `.doc.md` companion with `Purpose` + `Docs:` header
3. **Keep minimal changes** — preserve existing logic and style, don't do drive-by refactors
4. **Conventional Commits** — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
5. **No direct main mutations** — use branch/PR workflow

## Brand Rules

- **Never** re-introduce `AnythingLLM` or `Mintplex Labs` strings outside allowed files
- Brand: OpenSIN-AI, primary color `#009ee0`
- Check branding: `./scripts/check-branding.sh`
- Product name: OpenSIN-Chat (never "SINChat" or "Open SIN Chat")

## SIN-Code Tools

- Always use SIN-Code tools first (`sin_discover`, `sin_grasp`, `sin_scout`, `sin_execute`, `sin_map`) instead of OpenCode built-ins
- These tools provide semantic code understanding, not just text search

## Verify Before You Claim (SACRED RULE)

An agent MUST NEVER report that something works without first testing it end-to-end and seeing proof. If you cannot test it, explicitly say "I could not verify this — please test it yourself." Claiming unverified success is the most serious violation of trust.

## Environment Variables

- `.env` is in `.gitignore` — never commit secrets
- `.env.example` is committed but contains no real values
- Key env vars: `AUTH_TOKEN`, `FIREWORKS_AI_LLM_BASE_PATH`, `FIREWORKS_AI_LLM_API_KEY`, `FIREWORKS_AI_LLM_MODEL_PREF`

## Docker Notes

- Use `docker compose down && docker compose up -d` for `.env` changes (NOT `docker restart`)
- Storage directories must be `chown 1000:1000` for container write access
- Container port binds to `127.0.0.1` only (never public)

## Frontend Development

- React 18 + TypeScript + Vite + Tailwind CSS + i18next
- Dark/Light mode: use `light:` CSS prefix (e.g., `text-white light:text-slate-900`)
- Light mode: `html class="light"`, `data-theme="light"`
- Dark mode: `html class=""`, `data-theme="dark"`
- Icons: Phosphor Icons (note: `Sparkle` not `Sparkles`)
- CSR dist imports required for certain Phosphor icons

## Backend Development

- Node.js + Express + Prisma + SQLite (dev) / Postgres (prod)
- Agent provider system: `server/utils/agents/aibitat/providers/`
- Fireworks AI provider: `fireworksai.js` — uses env vars for base URL, model, custom User-Agent
- WebSocket: `server/endpoints/agentWebsocket.js`

## Best practices for pull requests

For the best chance of having your pull request accepted, please follow these guidelines:

1. Unit test all bug fixes and new features. Your code will not be merged if it
   doesn't have tests.
2. Run `yarn lint:check` and `yarn build` before requesting review. Your code
   will not be merged if lint or build fails.
3. Run `./scripts/check-branding.sh` — it must pass (no `AnythingLLM` or
   `Mintplex Labs` strings in new code).
4. If you change the public API, update the documentation in `docs/` of this repository.
5. Aim to minimize the number of changes in each pull request. Keep to solving
   one problem at a time, when possible.
6. Before marking a pull request ready-for-review, do a self review of your code.
   Is it clear why you are making the changes? Are the changes easy to understand?
7. Use [conventional commit messages](https://www.conventionalcommits.org/en/) as pull request titles. Examples:
    * New feature: `feat: adding foo API`
    * Bug fix: `fix: issue with foo API`
    * Documentation change: `docs: adding foo API documentation`
    * Chore: `chore: updating dependencies`
    * Refactor: `refactor: simplify foo logic`
8. If your pull request is a work in progress, leave the pull request as a draft.
   We will assume the pull request is ready for review when it is opened.
9. When writing tests, test the error cases. Make sure they have understandable
   error messages.

## Project structure

The core library is written in Node.js. There are additional sub-repositories for the embed widget and browser extension. These are not part of the core OpenSIN-Chat project, but are maintained by the OpenSIN-Chat team.

* `server`: Node.js server source code (Express + Prisma + SQLite/Postgres)
* `frontend`: React frontend source code (Vite + React 18 + TypeScript + Tailwind)
* `collector`: Python document ingestion and OCR service
* `docker/`: Docker and Docker Compose setup
* `cloud-deployments/`: Cloud deployment templates (AWS, GCP, Azure, DO, Helm, OpenShift)
* `docs/`: Architecture docs, ADRs, plans, runbooks

## Sync Between Repos

- OpenSIN-Chat is the primary repo (`OpenSIN-AI/OpenSIN-Chat`)
- OpenAfD-Chat is a private fork (`Family-Team-Projects/OpenAfD-Chat`)
- Features are developed in OpenSIN-Chat first, then synced to OpenAfD-Chat via `cp` with URL/branding substitutions

## Brand guard

OpenSIN-Chat is a fork of AnythingLLM (MIT). Never re-introduce `AnythingLLM` or `Mintplex Labs` strings in user-facing code, UI, or docs. The branding check (`./scripts/check-branding.sh`) must pass before merge. See [`AGENTS.md`](AGENTS.md) for the full project rules.

## Release process

Changes to the core OpenSIN-Chat project are released through the `main` branch. When a PR is merged into `main`, a new version of the package is published to GitHub Container Registry (GHCR) under the `latest` tag.

When a new version is released, a new image is built and pushed to GHCR (`ghcr.io/opensin-ai/opensin-chat`) under the associated version tag. Version tags are of the format `v<major>.<minor>.<patch>` and are pinned code, while `latest` is the latest version of the code at any point in time.

Production is deployed at `https://sinchat.delqhi.com` via Cloudflare Tunnel. See [`docs/OPENSIN-CHAT-DEPLOYMENT.md`](docs/OPENSIN-CHAT-DEPLOYMENT.md) for the full deployment guide.

### Desktop propagation

Changes to the desktop app are downstream of the core OpenSIN-Chat project. Releases of the desktop app are published at the same time as the core OpenSIN-Chat project. Code from the core OpenSIN-Chat project is copied into the desktop app into an Electron wrapper. The Electron wrapper that wraps around the core OpenSIN-Chat project is **not** part of the core OpenSIN-Chat project, but is maintained by the OpenSIN-Chat team.

## License

By contributing to OpenSIN-Chat (this repository), you agree to license your contributions under the MIT license.
