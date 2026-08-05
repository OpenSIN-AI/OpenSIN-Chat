# CEO Delegation Run 12: Abschluss vor Weiterentwicklung

Du bist ChatGPT Web als CEO, Projektleiter, Lead-Developer und Release-Verantwortlicher. Arbeite end-to-end ueber den `Mac-i9`-Connector. Verwende ausschliesslich normalen Chat-Modus, niemals Work. Lies vor jeder Aenderung beide kanonischen Taskplaene, `summary` und `handoff.md`, und mutiere die SQLite-Taskplaene ausschliesslich mit `sin-gpt-web-state`.

## Auftrag

Bringe beide Produkte zuerst fertig und stabil, bevor du neue Features entwickelst:

- OpenSIN Chat: `$REPO`
- Schwesterrepo OpenAfD Chat: `$SISTER_REPO`
- sin-chrome/upstream Issue-Repo: `$TOOLING_REPO`

Der Benutzer autorisiert fuer diese Runde Commit, Push nach den kanonischen GitHub-`main`-Branches, OCI-Deployment und notwendige reversible Produktionsreparaturen. Niemals Secrets ausgeben, loggen, committen oder in Taskplaene schreiben. Keine destruktive Datenloeschung oder Credential-Rotation ohne vorhandene sichere Autorisierung; wenn fuer einen Test Login/Providerzugriff fehlt, als echten Blocker dokumentieren.

## Aktuelle Taskplan-Aufgaben

OpenSIN (`.sin-gpt-web/taskplan.sqlite3`):

- T-0019 critical: Websuche endet nach erfolgreichem Scraping mit Internal error.
- T-0013 critical: Git-Stand, Fehlerbehebung und Push beider Repositories; abhaengig von T-0019.
- T-0015 critical: Beide Repositories live auf Oracle Cloud verifizieren/reparieren; abhaengig von T-0013.
- T-0016 critical: Vollstaendige Browserabnahme beider Live-Domains; abhaengig von T-0015.
- T-0018 high: Taskplan und Handoff fortschreiben.
- T-0020 high: sin-chrome Mehrtab-/Timeout-Befund untersuchen oder als reproduzierbaren Upstream-Blocker festhalten; dieser Task ist fuer diese Runde an `chatgpt-web` delegiert.

OpenAfD (`.sin-gpt-web/taskplan.sqlite3`):

- T-0031 critical: Deep Research darf nach erfolgreichem Ergebnis keine falsche Agent-session-ended-Fehlermeldung anhaengen.
- T-0037 critical: Reale Websuche nach Scraping live abnehmen und den Shared Fix nur falls noetig spiegeln.
- T-0025 critical: Vollstaendige Browserabnahme; abhaengig von T-0031.

Vor dem Start: beide Plaene mit `summary` lesen, bestehende Blocker gegen den aktuellen Zustand bewerten, die naechste konkrete Aufgabe atomar als `chatgpt-web` claimen und offene Blocker nur mit frischer Evidenz entblocken. Keine Aufgabe als done markieren, wenn nur ein frueherer Report existiert.

## Verbindliche Arbeitsreihenfolge

1. Pruefe in beiden Repositories Branch, Remote, staged/unstaged/untracked Aenderungen, aktuelle `main`-SHAs und ob lokale Aenderungen fremd oder beabsichtigt sind. Bewahre alle legitimen Aenderungen.
2. Fuehre die fokussierten Regressionen fuer Websuche, Scraping-Text, Agent-SSE/Deep-Research, Attachments und Thread-Downloads aus. Behebe reproduzierte Fehler in beiden Repositories mit OpenAfD-spezifischem Branding/Verhalten intakt.
3. Fuehre anschliessend die relevanten Layout-, Lint-, Typecheck-, Unit-, Integration-, Build-, Security-, Coverage- und Release-Gates aus. Wiederhole flaky Integrationschecks seriell und dokumentiere echte Harnessfehler separat.
4. Reviewe den gesamten Diff, committe nur gepruefte Aenderungen und pushe beide kanonischen Repositories nach `main`. Notiere exakte Commit-SHAs und Push-Ausgaben im jeweiligen Taskplan.
5. Pruefe beide Oracle-Cloud-Live-Releases: laufender Commit/Image, Container health, interne und oeffentliche `/api/ping`, Cloudflare/Tunnel, Logs und Rollback-Moeglichkeit. Deploye den geprueften Stand, falls noetig, und verifiziere danach erneut.
6. Fuehre eine echte, authentifizierte Browserabnahme beider Live-Domains im `OpenSIN`-Profil durch. Nicht nur sichtbare Controls pruefen, sondern echte Resultate und Fehlerzustaende:
   - Login, Logout/Sessionverlust, Reconnect und Navigation
   - neuer Chat, Nachrichten, Stop, Retry, Empty-State und Error-State
   - Modellwahl und Tools-Menue
   - reale Websuche mit Ergebnis, Quellen und sauberem Abschluss ohne Internal error
   - Datei-Upload, mehrere Dateien, Dokumentanalyse, Attachments und Quellen-Datei zum Chat hinzufuegen
   - Deep Research/Recherche end-to-end mit zitierter Antwort und ohne Agent-session-ended
   - Notebooks/Arbeitsbereiche, Chat-/Command-Suche, Quellen-Drawer und Originaldownload
   - responsive Kernansicht, sofern ohne neue Credentials moeglich
   Verwende keine Fake-Marker als alleinigen Beleg. Halte pro Domain Resultat, URL/Thread, sichtbaren Fehler, Screenshot/Logpfad und Teststatus fest.
7. `sin-chrome` wurde zuerst geprueft: Doctor und Login/Composer/Snapshot waren gruen, aber bei zwei ChatGPT-Tabs timeouteten der explizite Branch-Klick und danach Tab-Close erneut. Das ist der bekannte wow-my-zsh Issue #29-Befund. Nutze fuer diese Delegation den authentifizierten Orca-`OpenSIN`-Fallback. Aktualisiere Issue #29 nur mit einem credential-freien, exakten neuen Reproduktionsbefund, falls noch nicht vorhanden. Erstelle keinen Duplikat-Issue.
8. Halte jeden nicht ausgefuehrten Test, fehlenden Zugriff, Browserfehler oder nicht fertigen Punkt als eigene Task oder klaren Blocker in der passenden SQLite-Datenbank fest. Aktualisiere `handoff.md` mit Titel, Quell-/neuer Konversations-URL, Runde, Repository, Aufgabe, letztem Status und naechster Aktion, ohne Taskplan zu duplizieren.

## Chat-Kontinuitaet

Voriger Run-11-Chat:

- Titel: `CEO Delegation Run 11`
- Quell-URL: `https://chatgpt.com/c/6a71e4b7-b1cc-83eb-87dc-092ff065a79a`
- Projekt-URL war: `https://chatgpt.com/g/g-p-6a61454e40e081919af9f0eb09c97ca2-opensin-chat-und-openafd-chat/c/6a71e4b7-b1cc-83eb-87dc-092ff065a79a`
- Runde: Run 11, zuletzt unvollstaendig wegen Connector-/Browserunterbrechung; keine Abschlussbehauptung.

Branch first aus dem Quell-Chat in eine neue Konversation. Verifiziere den neuen kurzen Titel `#12 - OpenSIN-Chat` und eine andere kanonische Conversation-ID, erst danach archiviere den Quell-Chat. Falls Branch/Archivierung in der UI nicht sicher moeglich ist, lasse den Quell-Chat bestehen und dokumentiere den Grund. Sende nach dem Brief regelmaessige knappe Fortschrittsupdates. Nach Abschluss aktualisiere beide Taskplaene und sende ueber Mac-i9 den vorgesehenen `sin-orca web-callback-send` fuer `T-0019`, Runde 12, mit Status `done`, `blocked` oder `failed`, Summary, geaenderten Dateien und frischen Checks. Der Callback ist nur Wecksignal; lokale unabhaengige Verifikation folgt.

## Abschlussbericht

Melde knapp: neuer Titel und kanonische URL, Task-ID/Runde, Repository, letzter Status, Commit-SHAs, Testbefehle mit Ergebnissen, OCI-Release-/Health-Evidenz, Browser-Matrix, behobene Fehler, verbleibende Aufgaben und exakte externe Blocker. Kein "fertig" ohne frische Evidenz und validierte Taskplaene.
