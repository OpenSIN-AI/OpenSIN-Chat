# check-branding.sh — OpenAfD Chat Branding Linter

## Was diese Datei tut

CI-Linter, der verhindert, dass `AnythingLLM` / `Mintplex Labs`-Strings in den
Anwendungs-Code von OpenAfD-Chat einsickern. Fails CI bei Drift, gewährt
explizite Whitelist für Dateien, die das Upstream-Crediting enthalten.

## Dependency Map

| Abhängigkeit | Zweck |
|---|---|
| `ripgrep` (`rg`) | Pattern-Matching, deutlich schneller als `grep -r` |
| `bash` ≥ 4.0 | `set -euo pipefail`, `mktemp`, `trap` |

## Whitelist-Logik

`ALLOWED_FILES` ist die Single Source of Truth. Alles, was hier nicht steht,
darf keine Brand-Strings enthalten. Beim Hinzufügen einer Datei muss immer ein
Kommentar daneben stehen, der erklärt, **warum** die Ausnahme nötig ist — sonst
verfällt die Linter-Semantik.

## Patterns (was geflagged wird)

| Pattern | Was | Beispiel |
|---|---|---|
| `AnythingLLM` | Display-Name | `Welcome to AnythingLLM!` |
| `anythingllm` | Identifier/URL | `cdn.anythingllm.com` |
| `Mintplex` | Company | `Mintplex Labs Inc.` |
| `cdn.anythingllm.com` | Telemetry-CDN | **darf nicht mehr im Code sein** |
| `hub.anythingllm.com` | Community-Hub | externe API, **darf nicht im Frontend** sein |
| `docs.anythingllm.com` | Doku-CDN | optional, besser durch `openafd.delqhi.com/docs` ersetzen |
| `team@mintplex` | Mail-Adresse | **nur in `THIRD-PARTY.md`** |

## Usage

```bash
# Lokal ausführen
./scripts/check-branding.sh

# In CI (GitHub Actions)
- name: Branding Lint
  run: bash scripts/check-branding.sh
```

## Exit-Codes

| Code | Bedeutung |
|---|---|
| 0 | Sauber, keine Verstöße |
| 1 | Mindestens ein Brand-String außerhalb der Whitelist gefunden |

## Footguns

- **Lock-Files:** `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock` referenzieren
  `@mintplex-labs/*` Packages. Sind explizit via `--glob '!**/*-lock.*'`
  ausgeschlossen — nicht entfernen.
- **`server/models/communityHub.js`:** nutzt `importPrefix: "allm-community-id"`
  für DB-Backward-Compat. Whitelist-Eintrag nötig.
- **`server/models/workspace.js`:** nutzt `provider: "anythingllm-router"` aus
  DB-Backward-Compat. Whitelist-Eintrag nötig.
- **Neue Datei mit Brand-String:** erst in `THIRD-PARTY.md` referenzieren, dann
  zur `ALLOWED_FILES` hinzufügen **mit Kommentar**, sonst vergisst man die
  Intention in 6 Monaten.

## Hinzufügen eines neuen Patterns

Wenn Upstream z. B. eine neue Subdomain `cdn2.anythingllm.com` einführt:

1. Pattern zur `PATTERNS` Array hinzufügen
2. Test mit `rg "cdn2\.anythingllm.com" .` lokal
3. Wenn false-positives in legit-Dateien auftreten → ALLOWED_FILES erweitern
4. CI pushen

## Directory Wildcards

Ein Eintrag in `ALLOWED_FILES`, der mit `/` endet (z. B. `scripts/upstream-sync/`),
wird als **Verzeichnis-Wildcard** behandelt — jede Datei darunter ist whitelisted.
Nutze das für Bündel, die legitime Upstream-Referenzen enthalten (z. B. das
Sync-Tool + seine rohen Upstream-Patch-Dateien).
