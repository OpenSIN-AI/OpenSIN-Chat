# Upstream-Sync — CoDocs

> Companion-Doku für `scripts/upstream-sync/`. Was die Skripte tun, was sie nicht tun, und wo die Fußangeln lauern.

## Was diese Skripte tun

OpenAfD-Chat synct nicht automatisch mit Upstream. Stattdessen generiert `generate-patches.sh` eine **sortierte Sammlung atomarer Patches** aus dem aktuellen Upstream-`master`, und `apply-patches.sh` legt sie in einer vorgegebenen Reihenfolge auf einen Branch, mit Merge-Konflikt-Markern statt Auto-Resolve.

**Ein Patch pro Upstream-Commit, einsortiert in 6 logische Gruppen.** Maintainer reviewed pro Gruppe, fixt Konflikte einmal pro Gruppe, nicht 27 Mal hintereinander.

## Dateien

| Datei                                          | Zweck                                                       |
|------------------------------------------------|-------------------------------------------------------------|
| `generate-patches.sh`                          | Upstream fetchen, `format-patch` ausführen, sortieren       |
| `apply-patches.sh`                             | `git am --3way` in Gruppen-Reihenfolge anwenden            |
| `patches/MANIFEST.md`                          | Generierte Übersicht: welche Patches, welche Gruppen       |
| `patches/01-security-hardening/*.patch`        | 4 Patches: SDK-Timeout, Path-Safety, CVE-Filter, Consent    |
| `patches/02-critical-bugfixes/*.patch`         | 5 Patches: XML-Chars, SearXNG, Azure-Fallback, …            |
| `patches/03-voice-features/*.patch`            | 2 Patches: STT (OpenAI), Kokoro TTS                         |
| `patches/04-document-handling/*.patch`         | 2 Patches: HTML→Markdown, Document-Sync-Config              |
| `patches/05-llm-providers/*.patch`             | 5 Patches: Cerebras, Default-Thread, Generic-OpenAI, …      |
| `patches/06-ui-docs/*.patch`                   | 5 Patches: Toggle-Styles, Sponsoren, Terms-Wording          |
| `upstream-sync.doc.md` (diese Datei)           | Doku                                                        |

**Abhängigkeiten:**

- `git` (>= 2.25 für `git switch`, >= 2.30 für `--3way` Stabilität)
- `bash` >= 3.2 (default /bin/bash auf macOS — getestet)
- `git remote add upstream https://github.com/Mintplex-Labs/anything-llm.git`

**Aufgerufen von:** keinem anderen Tool — manuelle Workflow-Steps. Siehe `docs/UPSTREAM-SYNC.md` für den vollen Workflow.

## Konfiguration (Defaults)

| Variable             | Default              | Zweck                                            |
|----------------------|----------------------|--------------------------------------------------|
| `UPSTREAM_REMOTE`    | `upstream`           | Name des Git-Remotes (überschreibbar via ENV)    |
| `V1_13`              | `v1.13.0`            | Tag/Ref, gegen den die Patches basieren          |
| `MASTER_REF`         | `upstream/master`    | Ref, bis zu dem gepatcht wird                     |

`v1.13.0` ist hartkodiert, weil unser Squash-Import auf diesem Tag basiert (siehe `package.json:version`). **Bei einem künftigen Re-Sync auf v1.14.0 o.ä. muss `V1_13` in `generate-patches.sh` angepasst werden.**

## Gruppen-Klassifikation (in `generate-patches.sh`)

Die Variablen `GROUP_01_SECURITY`, `GROUP_02_BUGFIX`, … enthalten die SHAs. **Diese Liste muss bei jedem Sync geprüft und erweitert werden**, da neue Upstream-Commits dazukommen.

Heuristik:
- **01 Security:** CVE/Timeout/Path-Traversal/Sicherheits-Konfig
- **02 Bugfixes:** Korrektheits-Fehler (Output, Search, Config-Persistenz)
- **03 Voice:** Speech-to-Text + TTS Provider
- **04 Document:** Scraping + Sync
- **05 LLM:** Neue Provider + Agent-Refactorings
- **06 UI/Docs:** Cosmetic + Doku + Sponsoren

## Was NICHT skriptgesteuert ist

1. **Konflikt-Resolution.** `apply-patches.sh` stoppt beim ersten Konflikt. Maintainer fixt manuell mit `git am --3way` + Editor + `git add` + `git am --continue`.
2. **Branching.** Wir erstellen den Sync-Branch nicht selbst — das ist eine bewusste Designentscheidung, damit der Maintainer den Branch-Namen kontrolliert (siehe `docs/UPSTREAM-SYNC.md` Schritt 1).
3. **Rebrand-Anpassungen.** Wenn ein Upstream-Patch einen Display-String wie "AnythingLLM" einführt, den wir auf "OpenAfD Chat" umschreiben wollen, muss das VOR `git am --continue` passieren. Der Branding-Linter fängt's danach nochmal ab.
4. **Breaking-Changes-Detection.** Wir prüfen nicht, ob ein Sync mit dem OpenAfD-Datenmodell bricht (z. B. neues Pflicht-Feld in `workspaces`-Tabelle). Das ist manuell.

## Fußangeln

### 1. Merge-Commits in der Gruppe
`git format-patch` schließt Merge-Commits aus. Wenn ein Upstream-Commit nur per Merge reinkommt (z. B. ein Backport aus einem Feature-Branch), fehlt er in unseren Patches. Lösung: manuell `git cherry-pick <sha>`.

### 2. Patch-Reihenfolge = Commit-Reihenfolge
`apply-patches.sh` sortiert die Patches per Dateinamen. `git format-patch` nummeriert sie nach Reihenfolge im Upstream-Range, also `0001-…` ist der älteste Commit, `0023-…` der neueste. **Niemals die Numerierung manuell ändern**, sonst bricht die Reihenfolge.

### 3. Branches divergieren schnell
Wenn der Maintainer auf `ref/upstream-sync-2026-06-06` mitten im Konflikt-Fixen steckenbleibt und ein anderer Maintainer in der Zwischenzeit einen weiteren Sync-Branch startet, gibt's divergent. Lösung: **immer einer zur gleichen Zeit**, Branch-Namen mit Datum machen das offensichtlich.

### 4. ENV-Var-Konflikte
`updateENV.js` enthält eine Allowlist von ENV-Vars. Wenn Upstream eine neue einführt (z. B. `CEREBRAS_API_KEY` für den neuen Cerebras-Provider), muss die Allowlist manuell erweitert werden — `apply-patches.sh` zeigt das als Konflikt.

### 5. Lokale Mods gehen verloren
Wenn ein Patch eine Datei touched, die wir lokal modifiziert haben (z. B. `server/utils/files/logo.js` mit unserer Logo-Shim), wird `git am --3way` die Mods erhalten, aber `git am` (ohne `--3way`) würde sie überschreiben. **Immer mit `--3way`.**

### 6. Branding-Linter schlägt nach Sync an
Erwartet. Wenn ein neues Upstream-File `"AnythingLLM"` enthält und nicht auf der Whitelist steht (siehe `scripts/check-branding.sh`), meldet `bash scripts/check-branding.sh` einen Fehler. **Lösung:** Datei zur Whitelist hinzufügen MIT Kommentar, warum.

### 7. Bash 3.2 Inkompatibilität
Der Generator nutzt keine `declare -A` (gibt's erst ab Bash 4). Stattdessen parsen wir GROUP_SPECS aus einem Here-Doc. **Niemals `declare -A` einbauen, sonst läuft das Skript auf macOS nicht.**

## Siehe auch

- `docs/UPSTREAM-SYNC.md`         — Strategie-Doc
- `BRANDING.md`                    — Welche Dateien `"AnythingLLM"` enthalten dürfen
- `scripts/check-branding.sh`      — Linter, der Drift erkennt
- `THIRD-PARTY.md`                 — Upstream-Credit + Lizenz
