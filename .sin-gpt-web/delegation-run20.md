# CEO Abschlussrunde: OpenSIN Chat und OpenAfD

@Mac-i9

Du bist CEO, Lead-Implementierer, Tester und Release-Verantwortlicher. Arbeite diese Runde bis zum belegten Abschluss durch, nicht nur als Beratung. Keine neue Produktplanung: zuerst alle offenen Fehler, Tests, Release- und Abnahme-Gates schließen.

## Kanonische Repositories

- OpenSIN Chat: `/Users/jeremy/dev/OpenSIN-Chat`
- Schwesterrepo OpenAfD: `/Users/jeremy/dev/OpenAfD-Chat`
- sin-gpt-web / Browser-Tooling: `/Users/jeremy/dev/wow-my-zsh`

Nutze für jede lokale Datei, jedes Kommando, jeden Test, Git-/GitHub-Vorgang und jede Browserabnahme ausschließlich den Mac-i9-Connector. Lies in beiden Repositories zuerst `AGENTS.md`, `.sin-gpt-web/TASKPLAN.md`, `.sin-gpt-web/COMPLETION_REPORT.md` und `.sin-gpt-web/handoff.md`. Verwende `sin-gpt-web-state` für alle Planänderungen; bearbeite generierte Markdown-Ansichten nicht manuell.

## Offene Abschlussarbeit

1. OpenSIN T-0019: Websuche endet nach erfolgreichem Scraping mit Internal error. Reproduzieren, Ursache beheben, Regression testen, in OpenAfD spiegeln, beide main-Branches prüfen und pushen.
2. OpenSIN T-0022: vollständige API-Jest-Suite ist grün, beendet sich aber wegen offener Handles nicht selbst. Ursache sauber beheben; kein `forceExit` als Scheinlösung.
3. OpenSIN T-0021: alle übrigen offenen Aufgaben aus dem Abschlusslauf übernehmen und Taskplan/Handoff aktuell halten.
4. OpenAfD T-0031: Deep Research darf nach einem erfolgreichen Ergebnis keinen nachträglichen `Agent session has ended`-Fehler anhängen. T-0041 zur Quellenintegrität ebenfalls prüfen, umsetzen oder mit reproduzierbarer Evidence blockieren.
5. OpenAfD T-0039: mit dem aktuellen OpenSIN-Stand synchronisieren, ohne OpenAfD-Branding, politische Vertikalfunktionen oder eigene Konfiguration zu beschädigen.
6. OpenAfD T-0025 und OpenSIN T-0016/T-0015: nach den Fixes beide Live-Domains als immutable Releases auf OCI verifizieren/aktualisieren. Prüfe Container health, interne und öffentliche `/api/ping`, Cloudflare/Tunnel, aktiven Image-SHA und Rollback-Möglichkeit.
7. Vollständige authentifizierte Browserabnahme beider Domains mit frischer Evidence: Login/Reconnect, normaler Chat, echte Websuche mit sichtbarer offizieller Quelle und ohne Internal error, Deep Research mit Quellen, Datei-Upload, Quellen-Datei aus dem Drawer in den Chat übernehmen, Originaldownload, Modellwahl, Navigation, Notebooks, Suche, Reload-Persistenz, Empty-/Error-States sowie Desktop/Mobile.

## Harte Regeln

- Prüfe `git status`, Branch und Remote vor und nach jeder Änderung. Bewahre vorhandene absichtlich uncommitted Änderungen, untersuche sie und überschreibe nichts blind.
- Committe und pushe autorisierte Änderungen nach `origin/main`; User hat normale Codeänderungen, Tests, Commits, GitHub-main-Pushes, OCI-Deployment und reversible Reparaturen ausdrücklich autorisiert.
- Keine Secrets ausgeben, loggen, in Taskplan/Evidence schreiben oder rotieren. Keine destruktiven Remote-/Datenbanklöschungen ohne Rückfrage.
- ChatGPT Web ist Standard-Writer. Worker nur für eng begrenzte read-only Exploration/Tests; keine breiten Worker-Edits.
- Nach jedem Claim, Test, Fix, Push, Deployment oder Browserlauf den jeweiligen SQLite-Taskplan atomar aktualisieren. Titel, kanonische ChatGPT-Konversations-URL, Aufgabe, Repositories, letzter Status, Evidence und Blocker im Handoff/Taskplan festhalten.
- Behaupte keinen Erfolg aus Chattext allein. Führe frische Tests und Livechecks aus; wenn Connector, SSH, Auth, Provider oder Browser blockiert, erfasse den exakten Fehler als Blocker und fahre mit unabhängigen Gates fort.
- SIN-Chrome wurde zuerst geprüft: Doctor/Status/Snapshot funktionieren, aber der explizite Projekt-Conversation-Options-Klick timed out. Dieser Mehrtab-Befund gehört zu wow-my-zsh Issue #29; nutze jetzt den authentifizierten Orca-Fallback im OpenSIN-Profil und dokumentiere neue reproduzierbare Befunde sicher dort.

## Abschluss

Arbeite alle eligible Tasks weiter ab, bis die Definition-of-Done in beiden Taskplänen erfüllt ist oder ein echter externer Blocker mit Evidence bleibt. Sende danach über Mac-i9 den vorgesehenen `sin-orca web-callback-send`-Status für den aktuellen Task/Round. Schließe/archiviere alte ChatGPT-Konversationen erst, wenn die neue Conversation-URL und der neue Titel nach Branch/Continuation verifiziert sind; nie behaupten, dass Archivierung gelungen ist, wenn die UI das nicht bestätigt.
