# Upstream-Sync-Strategie

> OpenSIN-Chat ist ein **Snapshot-Fork** von [Mintplex-Labs/anything-llm](https://github.com/Mintplex-Labs/anything-llm) (v1.13.0, 2026-05-26), kein Live-Sync. Diese Anleitung erklärt, wie neue Upstream-Releases in unseren Branch eingepflegt werden.

## Grundprinzipien

1. **Ein-Release-pro-Sync.** Wir ziehen immer gegen den aktuellen Upstream-`master` (oder einen neuen Release-Tag) — nicht inkrementell pro Commit.
2. **Squash-Patch-Serie.** Die 20-30 Commits zwischen unserem letzten Sync und Upstream-HEAD werden in **4–8 logische Gruppen** sortiert (Security, Bugfixes, Features, Docs, …).
3. **Jede Gruppe = eigene, reviewbare Patch-Datei(en).** Maintainer reviewed pro Gruppe, nicht pro Commit. Das hält die History sauber.
4. **Konflikte werden in der Gruppe sichtbar, nicht im Master.** Rebrand-Touch-Points (Display-Namen, `AnythingLLM` → `OpenSIN Chat`, Logo-Dateinamen) erzeugen die meisten Konflikte. Diese sind erwartet und werden vom Branding-Linter (`scripts/check-branding.sh`) in CI abgefangen.

## Workflow

```bash
# 0. Voraussetzungen
git remote -v                             # 'upstream' muss auf Mintplex zeigen
git fetch --tags upstream master

# 1. Frischen Sync-Branch erstellen
git checkout main
git pull
git checkout -b ref/upstream-sync-$(date +%Y-%m-%d)

# 2. Patches generieren
bash scripts/upstream-sync/generate-patches.sh
# → erstellt scripts/upstream-sync/patches/01-..06-*/*.patch
# → schreibt scripts/upstream-sync/patches/MANIFEST.md

# 3. Manifest reviewen
cat scripts/upstream-sync/patches/MANIFEST.md
# Stimmen die Gruppenzuordnungen? Neue Upstream-Commits müssen evtl.
# in GROUP_01..GROUP_06 in generate-patches.sh aufgenommen werden.

# 4. Patches anwenden — bei Konflikt stehen bleiben, manuell lösen
bash scripts/upstream-sync/apply-patches.sh
# → git am --3way pro Patch
# → bei erstem Konflikt: Stop, Maintainer fixt, commit, dann nochmal

# 5. Branding-Linter prüft das Resultat
bash scripts/check-branding.sh

# 6. Lint + Typecheck + Test
cd frontend && yarn lint && yarn build
cd ../server && yarn lint && yarn test
cd ../collector && yarn lint

# 7. PR eröffnen
git push -u origin ref/upstream-sync-$(date +%Y-%m-%d)
gh pr create --title "chore: sync upstream $(date +%Y-%m-%d)" \
             --body "Auto-generated via scripts/upstream-sync/. See MANIFEST.md."
```

## Commit-Gruppen (Stand 2026-06-06)

Die letzten 23 Upstream-Commits (4 Merge-Commits ausgeschlossen) sind wie folgt klassifiziert. **Bei jedem neuen Sync muss diese Liste in `generate-patches.sh` aktualisiert werden.**

| # | Gruppe              | Zweck                                                                  | Commits |
|---|---------------------|------------------------------------------------------------------------|---------|
| 01 | `security-hardening`  | CVE-Spam-Filter, Universal-SDK-Timeout, Path-Safety, Consent-Param   | 4       |
| 02 | `critical-bugfixes`   | Output-Korruption (XML), SearXNG, Swagger-Config, Azure-Fallback     | 5       |
| 03 | `voice-features`      | Server-Side STT (OpenAI), Kokoro TTS, cvoice.ai (OpenSIN-only)        | 2       |
| 04 | `document-handling`   | HTML→Markdown Scraping, konfigurierbares Sync-Intervall               | 2       |
| 05 | `llm-providers`       | Cerebras, Kill-Default-Thread, Generic-OpenAI, Agent-Summarizer      | 5       |
| 06 | `ui-docs`             | Toggle-Styles, Sponsoren, Embedding-Provider-Liste, Terms-Wording    | 5       |

## Wann NICHT syncen

- **Während einer heißen Release-Phase** (z. B. Mitglieder-Umfrage läuft). Sync kann das Wordmark, Branding oder ENV-Defaults brechen.
- **Vor einem geplanten Mitglieder-Push** (Newsletter etc.). Erst syncen, dann 1-2 Tage Test, dann pushen.
- **Wenn Upstream einen Breaking-Rename** ankündigt (große Refactorings). Manuell reviewen, evtl. nur Security-Backports ziehen.

## Tooling-Stand

- `scripts/upstream-sync/generate-patches.sh` — `git format-patch` + Verteilung in 6 Gruppen
- `scripts/upstream-sync/apply-patches.sh`    — `git am --3way` in Gruppen-Reihenfolge
- `scripts/check-branding.sh`                 — CI-Wächter gegen `AnythingLLM`/`Mintplex`-Leak
- `.github/workflows/branding-lint.yml`       — Linter läuft auf jedem Push + PR

## Siehe auch

- `BRANDING.md`         — Marken-Richtlinien + Whitelist
- `THIRD_PARTY.md`      — Upstream-Credit + Lizenz-Hinweise
- `CONTRIBUTING.md`     — PR-Konventionen (Conventional Commits)
