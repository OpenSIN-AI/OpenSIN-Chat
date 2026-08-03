# Delegation Brief Run-7 — Vollständige Abnahme + Fehlerfreiheit (OpenSIN-Chat + OpenAfD-Chat)

Repository (primary): `/Users/jeremy/dev/OpenSIN-Chat`
Schwester-Repo: `/Users/jeremy/dev/OpenAfD-Chat`
Datum: 2026-08-03, Run-7

## Priorität: FERTIG WERDEN, nicht weiterentwickeln

Die aktuelle Priorität ist es, ALLE offenen Aufgaben abzuschließen und beide Produkte
fehlerfrei funktionsfähig zu machen. KEINE neuen Features, KEINE Architektur-Umbauten,
KEINE Refactorings — nur fertigstellen, verifizieren, beheben, deployen.

## Startpunkt (lokal verifiziert, 2026-08-03T13:00Z)

- OpenSIN-Chat: main = c9ccb529f (frisch gepusht, enthält neuen TASKPLAN.md Run-7), working tree clean.
- OpenAfD-Chat: main = e217bee02, synced mit origin/main, working tree clean.
- Beide Repos live auf OCI VM: opensin-app:f85dd1537 / openafd-app:5afa5604a, health=healthy, /api/ping online:true.
- sin-chrome ist weiterhin defekt (Issue #29 bestätigt) → Browser-Arbeit läuft über ORCA (Runtime ready, OpenSIN-Profil).

## Deine Aufgabe (ChatGPT Web als sovereign lead via Mac i9)

Lies ZUERST `.sin-gpt-web/TASKPLAN.md` und frage die DB ab:
`sin-gpt-web-state --repo /Users/jeremy/dev/OpenSIN-Chat summary`

Neue Run-7-Tasks (backlog, in Prioritätsreihenfolge):

1. **T-0013 (critical, implement)** — Git-Stand prüfen, Fehler beheben, alles nach main pushen:
   Beide Repos auf uncommitted/fehlerhafte Änderungen prüfen; alle gefundenen Fehler beheben
   (Tests/Lint/Typecheck/Build grün); nichts Offenes zurücklassen; autorisiert nach origin/main pushen.

2. **T-0014 (critical, implement)** — OpenAfD-Chat vollständig synchronisieren und fehlerfrei machen:
   Sicherstellen, dass OpenAfD ALLE neuesten OpenSIN-Fixes besitzt (Datei-Upload, Quellen-Pfade,
   Exakt-Einzeldatei-Antwort, Reload-Persistenz, Coverage-Gate). Alle Checks grün, Tests bestanden.
   Ggf. offene OpenAfD-Tasks (T-0031 Deep-Research-Hang, T-0025 Browserabnahme) prüfen und lösen —
   T-0025 ist NICHT mehr blockiert, Orca läuft jetzt stabil.

3. **T-0015 (critical, ops)** — Beide Repos live auf Oracle Cloud VM verifizieren und funktionierend halten:
   Falls neue Commits entstehen: immutable Images bauen, deployen (Release-Worktree-Pattern der
   Vorläufe), Health intern + öffentlich verifizieren, Rollback-Images dokumentieren.

4. **T-0016 (critical, test)** — Vollständige Browser-Abnahme ALLER Funktionen auf beiden Live-Domains
   (sinchat.delqhi.com, openafd.delqhi.com) über Orca:
   - Websuche (echte Suche mit Quellen)
   - Datei-Upload (echte Attachments, Download als Originaldatei)
   - Quellen-Dateien aus dem Drawer in den Chat übernehmen / aus Quellen chatten
   - Deep Research (Agent-Modus)
   - Normaler Chat + Reload-Persistenz
   - Login/Reconnect/Session-Termination
   - Navigation, Sidebar, Notebooks, Neuer Chat, Threads, Quellen-Drawer, Recherche-Bereich
   - Modellwahl (alle Modelle wählbar, aktiviertes Modell korrekt)
   - ⌘K-Suche
   - Empty/Error-States
   JEDEN Bug, jedes Fehlende, jedes Nicht-Fertige EXAKT im Taskplan dokumentieren
   (block/update/neuer Task via sin-gpt-web-state) — nicht nur im Chat erwähnen.

5. **T-0017 (high, ops, owner local-agent)** — sin-chrome-Fallback: bereits erledigt, Issue #29 frisch
   kommentiert. Nur für dich als Info: Browserarbeit über Orca.

6. **T-0018 (high, ops)** — Taskplan und Handoff aktuell halten: Titel, Konversations-URL, Aufgabe,
   Repos, letzter Status, Blocker, Evidence in `.sin-gpt-web/handoff.md` + DB festhalten.
   Am Ende COMPLETION_REPORT.md aktualisieren.

## Blockierte Alt-Tasks prüfen (OpenAfD)

- T-0031 (Deep-Research-Hang): Prüfe ob behebbar — wenn ja, beheben (beide Repos), wenn extern blockiert, begründen.
- T-0001 (Key-Rotation, OpenAfD): Extern blockiert? Aktuellen Status prüfen und ehrlich im Taskplan festhalten — nur rotieren, wenn autorisiert und technisch möglich.
- T-0025 (Browserabnahme blockiert): ENTBLOCCKEN — Orca läuft; Abnahme jetzt im Rahmen von T-0016 durchführen.

## Regeln

- Nutze Mac i9 für ALLE lokalen Datei-/Shell-Operationen in beiden Repos.
- MiMo Code nur bounded read-only (Suche, Tests, Diff-Review) — keine Commits, keine Architektur.
- Committe/pushe NUR nach grüner Verifikation. Behebe alle dabei entdeckten Fehler.
- Nach jedem abgeschlossenen Task: `sin-gpt-web-state complete <ID> --owner chatgpt-web --evidence "..." --actor chatgpt-web` mit echter Verifikationsevidenz.
- Melde kompakten Fortschritt statt Funkstille.
- Bei Rate-Limits: Handoff aktualisieren, 10–15 min Cooldown, dann fortsetzen.

## Autorisierung

- Commit + Push nach main (beide Repos): JA
- Deployment auf OCI VM: JA
- Token-Rotation: JA (mit Vorsicht, per Infisical/Secret-Disziplin)
- Keine destruktiven Aktionen ohne Rückfrage.
