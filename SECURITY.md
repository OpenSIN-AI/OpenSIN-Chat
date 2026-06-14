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

OpenSIN Chat is a self-hosted fork of [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm).
Vulnerabilities in unmodified upstream code should additionally be reported
upstream so the whole ecosystem benefits.

## Secrets & Deployment Hygiene

- Real `.env` files must never be committed (enforced by CI: `ceo-audit.yml`,
  `secrets-scan.yml`).
- `JWT_SECRET`, `SIG_KEY`, `SIG_SALT` and all provider API keys must be
  generated per deployment (e.g. `openssl rand -base64 32`) and rotated
  whenever they may have been exposed.
- Demo or onboarding credentials must never ship in the frontend bundle or
  README. If a credential has ever been published, treat it as compromised
  and rotate it immediately.

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
