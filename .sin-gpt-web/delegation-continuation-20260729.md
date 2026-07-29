# Delegation Brief — Fortsetzung (T-0016 abschließen, T-0018/T-0019 abschließen, T-0001 entblocken)

Repository: /Users/jeremy/dev/OpenSIN-Chat
Schwester-Repository: /Users/jeremy/dev/OpenAfD-Chat
Konversations-URL: https://chatgpt.com/c/6a693632-bdb0-83eb-b14d-85d015fac236

## Kontext (dein letzter Stand, verifiziert)

Du hast zuletzt gemeldet:
- T-0019 (SSE-reconnect-loop): Fix implementiert, Commits a5f0cd049 (OpenSIN) und c15e0aca6 (OpenAFD) gepusht, beide auf OCI live, Healthchecks grün, 40 Frontend + 8 Agent-SSE Tests grün.
- T-0018 (Recherche-Deep-Link): Auf beiden Live-Systemen browserseitig verifiziert (Agentenmodus bleibt deep-research, Work-Modus aktiv, Quellenpanel offen, kein Reload).
- T-0016 (Browser-Acceptance): NICHT vollständig — Mac-i9-Connector-Timeout während des kombinierten Live-Laufs. Die Remote-Artefakte liegen möglicherweise schon auf der VM, konnten aber nicht eingelesen werden.
- T-0001 bleibt blocked (NVIDIA NIM Portal-Passwort, BUNDESTAG_DIP_API_KEY).

Ich habe verifiziert: Beide Repos sind auf origin/main synchronisiert und sauber (OpenAFD hatte deinen Push c15e0aca6 noch nicht lokal — ist jetzt gepullt). Beide Live-Domains antworten HTTP 200.

## Deine Aufgaben jetzt (Priorität: fertig werden vor Weiterentwicklung)

1. T-0019 + T-0018 formal abschließen: `sin-gpt-web-state --repo /Users/jeremy/dev/OpenSIN-Chat complete T-0019 --owner chatgpt-web --evidence "..." --actor chatgpt-web` (gleiches für T-0018) mit der Evidenz aus deinem letzten Report. Gleiches im OpenAfD-Taskplan (`--repo /Users/jeremy/dev/OpenAfD-Chat`), falls dort diese Tasks existieren.

2. T-0016 abschließen (Hauptarbeit): Den unterbrochenen kombinierten Live-Browserlauf wiederholen, aber in KLEINEN Einzelschritten, damit kein Connector-Timeout entsteht. Nutze den bereits offenen Orca-Browser (Tabs für sinchat.delqhi.com und openafd.delqhi.com existieren; du kannst auch selbst serverintern per SSH auf der VM testen, wo es schneller ist). Zu verifizieren auf BEIDEN Live-Systemen:
   a. Normaler Chat: Nachricht senden, Modellantwort kommt an.
   b. Datei-Upload: echte Datei hochladen (z.B. kleine PDF/TXT), Upload wird akzeptiert und im Chat referenzierbar.
   c. Deep-Research-Websuche: Recherche auslösen, Ergebnis mit Quellen kommt an.
   d. Quellen-/Dateien-Panel: Datei aus Quellen zum Chat hinzufügen.
   e. Nach Abschluss: Agent-SSE-Endpunkt aufrufen — es dürfen KEINE wiederholten Aufrufe/HTTP 429 mehr auftreten (das ist die T-0019-Regressionsevidenz).
   Jeden gefundenen Bug, jede fehlende oder unfertige Funktion als NEUEN Task im Taskplan anlegen (`sin-gpt-web-state ... add`) mit exakter Beschreibung und Reproduktionsschritten. Committe und pushe Fixes sofort, wenn sie verifiziert sind.

3. T-0001 prüfen: Ist der Blocker (NVIDIA NIM Kontopasswort, BUNDESTAG_DIP_API_KEY) weiterhin ein externer Blocker? Falls ja: im Taskplan als dauerhaft extern-blockiert dokumentieren und mit klarer Begründung stehen lassen. Falls intern lösbar (z.B. durch Provider-Wechsel): lösen.

4. Abschluss: `.sin-gpt-web/COMPLETION_REPORT.md` in beiden Repos aktualisieren mit ehrlichem Endstatus, `sin-gpt-web-state validate` laufen lassen, letzten Commit pushen.

## Autorisierung

Commit, Push und Deployment auf die OCI-VM sind für diese Aufgaben autorisiert. Keine Secrets in Chats/Docs/Logs. Verwaiste Container (openafd-app-legacy-*, *-vane) NICHT löschen. Cloudflare-Tunnel-Duplikat nur konsolidieren, wenn gefahrlos.

Melde nach jedem abgeschlossenen Schritt kompakten Fortschritt.
