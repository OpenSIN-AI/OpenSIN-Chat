# Branding-Guidelines — OpenAfD Chat

> **Upstream-Credit:** OpenAfD Chat ist ein Community-Fork von
> [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) by
> [Mintplex Labs Inc.](https://github.com/Mintplex-Labs) (MIT). Wir danken
> dem Mintplex-Team ausdrücklich für die exzellente Grundlage, ohne die
> dieses Projekt nicht möglich wäre. 🙏

## Farben

| Token | Hex | Verwendung |
|-------|-----|------------|
| `--brand-primary` | `#009ee0` | Primärfarbe (AfD-Blau) — Buttons, Akzente, Links |
| `--brand-primary-dark` | `#0079b0` | Hover-States |
| `--brand-accent` | `#ffd700` | Highlights, Hervorhebungen (sparsam) |

## Logo

- **Vollformat:** `images/wordmark.svg` (mit "AfD CHAT" links + "OpenAfD" rechts)
- **Icon:** `frontend/src/media/logo/openafd-icon.svg` (für Sidebar, Favicon, App-Icon)
- **Login-Illustration:** `frontend/src/media/illustrations/login-logo.svg`

## Naming-Convention für Code

- **Display-Name:** `OpenAfD Chat` (mit Leerzeichen, in der UI)
- **Package-Name:** `openafd-chat` (in `package.json`)
- **Storage-Key-Präfix:** `openafd_` (z.B. `openafd_user`, `openafd_authToken`)
- **DB-Provider-Identifier:** `anythingllm-router` ⚠️ **bleibt** aus DB-Kompatibilität
- **NPM-Pakete von Dritten:** `@mintplex-labs/*` bleiben unverändert

## Externe URLs

- **Repository:** https://github.com/Family-Team-Projects/OpenAfD-Chat
- **Live-Instanz:** https://openafd.delqhi.com
- **Support:** support@openafd.delqhi.com
- **Upstream (Sync):** https://github.com/Mintplex-Labs/anything-llm

## Telemetrie-Policy

**KEINE Outbound-Calls zu Drittanbietern.** Dies ist eine harte Policy.
Auch keine:

- PostHog / Mintplex-CDN
- `cdn.anythingllm.com`
- `hub.anythingllm.com`
- `docs.anythingllm.com` (nur lesen, falls überhaupt nötig)

Code-Reviews müssen dies prüfen.
