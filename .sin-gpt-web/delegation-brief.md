# Delegation Brief an ChatGPT Web

## Repository
- Pfad: `/Users/jeremy/dev/OpenSIN-Chat`
- Schwester-Repo: `/Users/jeremy/dev/OpenAFD`

## Aktuelle Tasks (aus Taskplan)

### Offene Tasks:
1. **T-0019** (critical): OpenAfD Deep Research verliert Agent-WebSocket
   - Status: in_progress
   - Owner: chatgpt-web
   - Acceptance: Agent-WebSocket auf OpenAfD bleibt verbunden; Deep-Research-Websuche liefert Ergebnis/Quellen

2. **T-0016** (high): T-0013 Acceptance im Orca-Browser vollständig nachholen
   - Status: in_progress
   - Owner: chatgpt-web
   - Acceptance: Orca-Evidenz für Websuche, Datei-Upload, Quellen-Dateien und Chat-Funktionen auf beiden Live-Domains

3. **T-0018** (high): Recherche-Deep-Link verliert Agentenmodus beim Mount
   - Status: in_progress
   - Owner: chatgpt-web
   - Acceptance: Direkte Navigation zu ?mode=deep-research aktiviert Deep-Research-Modus

### Erledigte Tasks (Auswahl):
- T-0017 (critical): Login hinter TLS-Reverse-Proxy ✅
- T-0012 (high): OpenAfD-Chat synchronisieren ✅
- T-0011 (critical): Oracle Cloud VM prüfen ✅

## Ziel
1. Alle offenen Tasks abschließen
2. Nicht-committete Änderungen commiten und pushen
3. Fehler beheben
4. OpenAFD mit OpenSIN-Chat synchronisieren (aktuell unterschiedliche Repos!)
5. Beide Repositories auf Oracle Cloud VM live schalten
6. Alle Funktionen im Browser testen:
   - Websuche
   - Datei-Upload
   - Quellen-Dateien zum Chat hinzufügen
   - Chat-Funktionen
   - Deep Research Modus

## Wichtige Hinweise
- **sin-chrome funktioniert** und ist bereit
- OpenAFD ist NICHT synchronisiert (nur 3 Commits vs. OpenSIN-Chat 5+)
- Beide Repos müssen auf OCI VM live sein
- ChatGPT ist sovereign Lead und default Writer
- MiMo Code ist nur read-only explorer

## Nächste Schritte
1. Taskplan lesen: `sin-gpt-web-state --repo /Users/jeremy/dev/OpenSIN-Chat summary`
2. Offene Tasks claimen und bearbeiten
3. OpenAFD synchronisieren
4. Deployment auf OCI VM
5. Browser-Tests durchführen
6. Bugs dokumentieren

## Autorisierung
- Commit/Push: Autorisiert für beide Repos
- Deployment: Autorisiert für OCI VM
- Keine destructive Operations ohne Bestätigung
