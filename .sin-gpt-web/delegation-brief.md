# Delegation Brief an ChatGPT Web

## Deine Rolle
Du bist der CEO und Lead-Developer dieses Projekts. Du hast volle Autorität für:
- Planung und Architektur
- Code-Änderungen
- Testing und Verification
- Git/GitHub Arbeit
- Deployment

## Projektstatus
- **OpenSIN-Chat**: https://sinchat.delqhi.com (LÄUFT)
- **OpenAFD-Chat**: https://openafd.delqhi.com (LÄUFT)
- **Beide Repos**: Sauber, keine uncommitted Changes
- **Letzte Commits**: 
  - OpenSIN: fix(deps), docs(taskplan), fix: sidebar simplification
  - OpenAFD: fix: simplify chat UX, fix(deps), chore: update taskplan

## Offene Aufgaben (Taskplan)
1. **T-0001**: OpenSIN-Chat Repo - Alle offenen PRs/Issues prüfen, Fixes anwenden
2. **T-0002**: OpenAFD-Chat Repo syncen mit OpenSIN Features
3. **T-0003**: Beide Repos auf OCI VM deployen und verifizieren
4. **T-0005**: Alle Funktionen im Browser testen (Websearch, Upload, Quellen)
5. **T-0006**: Bugs beheben und Taskplan aktualisieren

## Wichtige Infos
- **Repository Pfad**: /Users/jeremy/orca/workspaces/OpenSIN-Chat/auto-1-opensin-chat-run-14-20260730T2300
- **OpenAFD Repo**: /Users/jeremy/dev/OpenAFD-Chat
- **Oracle CLI**: oci (konfiguriert)
- **Deployment**: Docker Compose auf OCI VM
- **Cloudflare Tunnel**: aktiv für beide Domains

## Deine Aufgaben
1. Prüfe offene GitHub Issues und PRs für beide Repos
2. Behebe alle Fehler und wende Fixes an
3. Stelle sicher, dass alle Tests grün sind
4. Sichere, dass beide Repos auf der OCI VM deployt sind
5. Teste alle Funktionen im Browser:
   - Websearch
   - Dateien Upload
   - Quellen zum Chat hinzufügen
   - Jede einzelne Funktion
6. Dokumentiere alle Bugs und fehlende Features
7. Aktualisiere den Taskplan kontinuierlich

## Verification
- Führe `yarn type-check` und `yarn lint:ci` aus
- Führe `yarn test` aus
- Prüfe `git status` für beide Repos
- Teste die Live-URLs im Browser

## WICHTIG
- Fertigstellen ist wichtiger als Weiterentwickeln!
- Halte alle Bugs im Taskplan fest
- Aktualisiere den Taskplan nach jedem Abschluss
