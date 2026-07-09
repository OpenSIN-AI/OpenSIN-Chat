# Branding Guidelines — OpenSIN Chat

> OpenSIN Chat is a sovereign, independent product by [OpenSIN-AI](https://github.com/OpenSIN-AI).

## Colors

| Token | Hex | Usage |
|-------|-----|------------|
| `--brand-primary` | `#009ee0` | Primary color (OpenSIN Blue) — buttons, accents, links |
| `--brand-primary-dark` | `#0079b0` | Hover states |
| `--brand-accent` | `#ffd700` | Highlights, accents (use sparingly) |

## Logo

- **Wordmark:** `images/wordmark.svg` (with "OpenSIN" text)
- **Icon:** `frontend/src/media/logo/opensin-icon.svg` (for sidebar, favicon, app icon)
- **Login Illustration:** `frontend/src/media/illustrations/login-logo.svg`

## Code Naming Conventions

- **Display Name:** `OpenSIN Chat` (with space, in UI)
- **Package Name:** `opensin-chat` (in `package.json`)
- **Storage Key Prefix:** `opensin_` (e.g., `opensin_user`, `opensin_authToken`)
- **Third-party NPM Packages:** upstream package scopes remain unchanged where used as-is

## External URLs

- **Repository:** https://github.com/OpenSIN-AI/OpenSIN-Chat
- **Live Instance:** https://sinchat.delqhi.com
- **Support:** support@sinchat.delqhi.com

## Telemetry Policy

**NO outbound calls to third parties.** This is a hard requirement.
Code reviews must verify this compliance.

For upstream acknowledgments and third-party component credits, see [`CREDITS.md`](./CREDITS.md).
