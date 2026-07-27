# Delegation Brief — Vollständige Aufgabenübernahme (OpenSIN-Chat + OpenAfD-Chat)

Repository: `$OPENSIN_REPO`
Schwester-Repo: `$OPENAFD_REPO`

Du bist der sovereign lead und default writer für dieses Projekt via Mac i9.
Lies ZUERST `.sin-gpt-web/TASKPLAN.md` und `taskplan.sqlite3` (via `sin-gpt-web-state --repo "$OPENSIN_REPO" summary`)
bevor du irgendetwas implementierst. Es gibt bereits einen aktiven Taskplan mit 15 Tasks
(2 in_progress, 1 blocked, 10 backlog, 2 done). Übernimm die offenen Tasks in Prioritätsreihenfolge:

- T-0002 (in_progress, critical) — Öffentliche Betriebsinformationen bereinigen
- T-0003 (critical) — SYS_ADMIN Cap und Docker Security
- T-0011 (critical) — Oracle Cloud VM (sin-supabase) prüfen und updaten
- T-0001 (blocked, critical) — Zugangsdaten rotieren — prüfe ob der Block noch gilt oder lösbar ist
- T-0004, T-0005 (high) — CI/CD real machen, immutable Docker Images
- T-0006, T-0007 (high) — Produktfokus (Video-Gen/cvoice raus, Navigation reduzieren)
- T-0012 (high) — OpenAfD-Chat synchronisieren
- T-0013 (in_progress, high) — Browser-Test aller Funktionen (Websuche, Datei-Upload, Quellen-Dateien, Chat-Funktionen) — vollständig im Orca-Browser durchführen und JEDEN Bug/fehlende Funktion im Taskplan dokumentieren
- T-0008, T-0009, T-0010 (medium) — Repo-Cleanup

## Neue kritische Erkenntnis (lokaler Agent, frisch verifiziert)

OpenSIN-Chat ist aktuell clean und synced mit origin/main (nichts zu committen).

OpenAfD-Chat (`$OPENAFD_REPO`) hat AKTUELL UNCOMMITTED ÄNDERUNGEN:
- collector/yarn.lock UND frontend/yarn.lock sind GELÖSCHT (jeweils komplett entfernt, ~13000 Zeilen)
- root yarn.lock stark verändert (1031 Zeilen Diff)
- package.json (root, collector, frontend, server) mit Dependency-Änderungen
- .github/workflows/ci.yml und pr-lint-test.yml verändert
- Das sieht aus wie eine unvollständige/abgebrochene Dependency-Migration (fehlende Lockfiles = Repo-Regel-Verstoß laut AGENTS.md: "Do not create nested lockfiles" / Lockfile-Disziplin)

Bevor du OpenAfD-Chat committest/pusht: Kläre ob diese Änderungen beabsichtigt sind (z.B. laufende Yarn-Migration), reproduziere `yarn install` und stelle sicher, dass Lockfiles konsistent und vollständig sind, bevor gepusht wird. Committe NICHT blind gelöschte Lockfiles.

## Deine Aufgabe jetzt

1. Task-Plan lesen, Ownership für nächsten Task claimen (`sin-gpt-web-state ... next --claim`).
2. Alle oben genannten offenen Tasks systematisch abarbeiten — Security P0 zuerst.
3. OpenAfD-Chat Repo-Status klären, sauber committen/pushen (nur wenn intentional und verifiziert), sicherstellen dass beide Repos denselben aktuellen Stand haben und fehlerfrei sind (lint, typecheck, build, tests grün).
4. Beide Repos müssen auf der Oracle Cloud VM live und funktionsfähig sein (sinchat.delqhi.com, openafd.delqhi.com) — prüfen, ggf. Container/Deployment aktualisieren.
5. Vollständigen Browser-Funktionstest im Orca-Browser durchführen (T-0013): Websuche, Datei-Upload, "Quellen"/Dateien zum Chat hinzufügen, und jede weitere sichtbare Funktion. Jeden gefundenen Bug oder unfertigen/fehlenden Feature EXAKT im Taskplan (`sin-gpt-web-state ... block/update` bzw. neuer Task) dokumentieren — nicht nur im Chat erwähnen.
6. Nach jedem abgeschlossenen Task: `sin-gpt-web-state complete <ID> --owner chatgpt-web --evidence "..." --actor chatgpt-web` mit echter Verifikationsevidenz (Testlauf, Diff, curl-Ergebnis etc.).
7. Committe/pushe nur wenn die Verifikation grün ist. Behebe alle Fehler, die dabei auffallen (Lint, Typecheck, Build, Tests, Security-Scan).
8. Am Ende: `.sin-gpt-web/COMPLETION_REPORT.md` aktualisieren mit ehrlichem Status — was ist fertig, was blockiert, was noch offen ist.

Nutze Mac i9 für alle lokalen Datei-/Shell-Operationen in beiden Repos. MiMo Code darf nur für bounded read-only Exploration genutzt werden (Suche, Tests laufen lassen, Diff-Review) — keine Commits, keine Architekturentscheidungen.

Melde regelmäßig kompakten Fortschritt statt Funkstille. Bei Rate-Limits: Handoff aktualisieren, 10-15min Cooldown, dann fortsetzen.
