# Security Policy

## Supported Versions

Only the latest state of the `main` branch receives security fixes.

| Version            | Supported          |
| ------------------ | ------------------ |
| `main` (latest)    | :white_check_mark: |
| older tags/commits | :x:                |

## Reporting a Vulnerability

**Please do NOT open a public issue or pull request for security vulnerabilities.**
Public PRs disclose the vulnerability to everyone before a fix is deployed.

Instead, use one of these private channels:

1. **GitHub Private Vulnerability Reporting** (preferred):
   [Report a vulnerability](https://github.com/OpenSIN-AI/OpenSIN-Chat/security/advisories/new)
2. **Email:** [support@sinchat.delqhi.com](mailto:support@sinchat.delqhi.com)
   — please include steps to reproduce, affected endpoint/file, and impact.

We aim to acknowledge reports within **72 hours** and to ship a fix or
mitigation for confirmed CRITICAL/HIGH findings within **14 days**.

## Scope Notes

OpenSIN Chat is a sovereign, independent product for political research and knowledge management.
If you discover vulnerabilities in dependencies shared with upstream projects, please also report them to those projects
so the wider open-source community benefits.

## Secrets & Deployment Hygiene

- Real `.env` files must never be committed (enforced by CI: `ceo-audit.yml`,
  `secrets-scan.yml`).
- `JWT_SECRET`, `SIG_KEY`, `SIG_SALT` and all provider API keys must be
  generated per deployment (e.g. `openssl rand -base64 32`) and rotated
  whenever they may have been exposed.
- Demo or onboarding credentials must never ship in the frontend bundle or
  README. If a credential has ever been published, treat it as compromised
  and rotate it immediately.

## Authentication

- **Single password authentication** via the `AUTH_TOKEN` environment variable.
- The password is set in the `.env` file, which is never committed to git
  (listed in `.gitignore`).
- All API endpoints require authentication except `/api/ping`.
- The session token is stored in the browser's `localStorage`.

## API Key Handling

- **Fireworks AI API Key**: stored in `.env` as `FIREWORKS_AI_LLM_API_KEY`.
  Never logged, never exposed to the frontend.
- **SINator Pool Router URL**: stored in `.env` as
  `FIREWORKS_AI_LLM_BASE_PATH`. Not exposed to the frontend.
- **Custom User-Agent**: `OpenSIN-Chat/1.0` is set in the
  `fireworksai.js` provider — the SINator Pool Router blocks the default
  OpenAI SDK User-Agent, so this custom header is required.
- The `.env` file is listed in `.gitignore` and never committed.
- `.env.example` is committed but contains no real secrets — only
  placeholder values.

## Port Binding

- The container binds to `127.0.0.1:38471` — **not** accessible from the
  public internet.
- The nginx reverse proxy listens on port `38481` — also localhost only.
- Only the **Cloudflare Tunnel** exposes the service publicly (via
  `sinchat.delqhi.com`).
- No direct port exposure to the internet. All external traffic flows
  through the tunnel.

## Cloudflare Tunnel Security

- The tunnel uses Cloudflare's **zero-trust model** — no inbound ports
  are required on the VM.
- **HSTS** is enabled with preload.
- **HTTPS redirect** (HTTP 301) is enforced at the Cloudflare edge.
- Security headers are set at the edge:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- Content Security Policy (CSP) headers are set via Cloudflare.

## Database Security

- SQLite database at `server/storage/opensin.db` — file permissions `640`.
- The database is inside the container, not directly accessible from the
  host filesystem.
- Backups are stored at `/home/ubuntu/backups/` with restricted permissions.
- The `workspace_notes` table was created via raw SQL because the Prisma
  migration was blocked by a CLI version mismatch (see Known Security
  Considerations below).

## Known Security Considerations

These items are tracked but do not currently pose an active security risk:

- **@agent WebSocket broken via Cloudflare Tunnel**: Cloudflare strips
  `Upgrade` headers, which breaks the `@agent` WebSocket channel. This is
  a **functional** issue, not a security risk.
- **Dependabot alerts on OpenSIN-Chat (this repo)
  vulnerabilities (2 high, 2 moderate, 1 low) — being tracked and
  addressed.
- **Prisma CLI version mismatch**: container has Prisma CLI `7.8.0` vs
  project `5.3.1`. Raw SQL workaround is used where migrations are
  blocked. Upgrading the project Prisma version is on the roadmap.

## Telemetry

- **Zero telemetry** — no third-party analytics, no outbound tracking, no
  tracking of any kind.
- All telemetry is completely disabled.

## Invalid Report Types

The following are intentional design decisions inherited from upstream and
will be closed without action:

### SSRF reports against the document collector

The collector is intentionally able to reach internal hosts so that
VPC-internal deployments can scrape internal services
(see [`collector/utils/url/index.js`](./collector/utils/url/index.js)).

> Note: this exception applies to the **collector** only. The research
> module's `ContentExtractor` blocks private/link-local targets by default;
> set `RESEARCH_ALLOW_PRIVATE_NETWORKS=true` to opt in to internal access.
> Reports that bypass this guard **are valid reports**.

### XSS reports requiring the user to right-click and paste a URL

Valid XSS reports must be zero-action (triggered on page or image load).
Self-inflicted, single-victim paste scenarios are not accepted.

### "Unauthenticated instance" reports

OpenSIN Chat supports running without authentication for trusted, isolated
environments. Operators choose between: no auth, single password, or
multi-user mode during onboarding. A missing password setup is not a
vulnerability — **bypassing** configured authentication absolutely is, and
such reports are welcome.
