# Branding Guidelines — OpenSIN Chat

> **Important:** OpenSIN Chat is a sovereign, independent product by [OpenSIN-AI](https://github.com/OpenSIN-AI).
> While it shares architectural foundations with earlier work, it is NOT a fork and should not be referred to as such.
> It is a purpose-built platform for political research, German compliance, and specialized intelligence workflows.

## Colors

| Token | Hex | Usage |
|-------|-----|------------|
| `--brand-primary` | `#009ee0` | Primary color (OpenSIN Blue) — buttons, accents, links |
| `--brand-primary-dark` | `#0079b0` | Hover states |
| `--brand-accent` | `#ffd700` | Highlights, accents (use sparingly) |

## Logo

- **Wordmark:** `images/wordmark.svg` (with "OpenSIN" text)
- **Icon:** `frontend/src/media/logo/openafd-icon.svg` (for sidebar, favicon, app icon)
- **Login Illustration:** `frontend/src/media/illustrations/login-logo.svg`

## Code Naming Conventions

- **Display Name:** `OpenSIN Chat` (with space, in UI)
- **Package Name:** `opensin-chat` (in `package.json`)
- **Storage Key Prefix:** `openafd_` (e.g., `openafd_user`, `openafd_authToken`)
- **DB Provider Identifier:** `anythingllm-router` (kept for database backward compatibility)
- **Third-party NPM Packages:** `@mintplex-labs/*` remain unchanged where used

## External URLs

- **Repository:** https://github.com/OpenSIN-AI/OpenSIN-Chat
- **Live Instance:** https://sinchat.delqhi.com
- **Support:** support@sinchat.delqhi.com

## Telemetry Policy

**NO outbound calls to third parties.** This is a hard requirement.
Blocked URLs:

- PostHog / Mintplex CDN
- `cdn.anythingllm.com`
- `hub.anythingllm.com`
- `docs.anythingllm.com`

Code reviews must verify this compliance.
