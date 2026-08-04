# CEO Delegation Run 11: Abschluss statt Weiterentwicklung

Du bist ChatGPT Web als CEO, Projektleiter und Lead-Developer. Arbeite über den
`Mac-i9`-Connector und führe die Aufgaben selbst end-to-end aus. Normale Code-,
Test-, Git-, GitHub- und Deployment-Arbeiten gehören in deinen Verantwortungs-
bereich. Verwende keinen Work-Modus. Lies vor jeder Änderung die Taskpläne und
aktualisiere die jeweilige SQLite-Quelle mit `sin-gpt-web-state`; bearbeite
höchste Priorität zuerst und halte Fortschritt, Evidenz, Fehler und Blocker
fortlaufend fest.

## Repositories

- OpenSIN Chat: `/Users/jeremy/orca/workspaces/OpenSIN-Chat/auto-8-opensin-chat-run-6-20260804T1300`
- Schwesterrepo OpenAfD: `/Users/jeremy/dev/OpenAfD`
- Tooling-Issue-Repo: `/Users/jeremy/dev/wow-my-zsh`
- Beide kanonischen GitHub-Repositories und die OCI-Zielumgebung sind für
  Commit, Push und Deployment ausdrücklich autorisiert.

## Verbindliche Reihenfolge

1. Lies `.sin-gpt-web/TASKPLAN.md`, `summary` und `handoff.md` in OpenSIN sowie
   OpenAfD. Claim die konkrete nächste Aufgabe atomar als `chatgpt-web`.
2. Prüfe in beiden Repositories Branch, Remote, untracked/staged/unstaged
   Änderungen, offene PRs/Issues und bekannte Regressionen. Bewahre fremde oder
   valide Änderungen; keine Secrets in Logs, Commits oder Taskplan.
3. Behebe alle reproduzierten Fehler und führe die relevanten Layout-, Lint-,
   Typecheck-, Unit-/Integration-, Build-, Security-, Coverage- und Release-
   Checks aus. Ein grüner Einzelcheck reicht nicht als Abschluss.
4. Synchronisiere erforderliche neueste Fixes zwischen OpenSIN und OpenAfD,
   ohne OpenAfD-spezifisches Branding oder Verhalten zu verlieren.
5. Reviewe den finalen Diff und pushe beide geprüften Repositories auf ihre
   kanonischen `main`-Branches. Dokumentiere Commit-SHAs und Push-Ergebnis.
6. Prüfe und repariere den Oracle-Cloud-Livebetrieb beider Produkte. Verifiziere
   Container/Services, Logs, Health-Endpunkte, öffentliche URLs, Cloudflare-
   Tunnel und dass der laufende Release-Commit dem geprüften GitHub-Commit
   entspricht. Deploye nur mit der hier erteilten Autorisierung und halte einen
   sicheren Rollback bereit.
7. Führe eine vollständige authentifizierte Browser-Abnahme beider Live-
   Anwendungen über Orca mit dem `OpenSIN`-Profil durch. Teste einzeln und
   dokumentiere Ergebnis oder Blocker für mindestens:
   - Anmeldung, Session/Logout/Reconnect und Navigation
   - neuen Chat, Nachrichten, Stop/Retry sowie Empty- und Error-States
   - Modellwahl, Tools-Menü, Websuche mit realem Ergebnis und Quellenanzeige
   - Datei-Upload, mehrere Dateien, Quellen-Datei zum Chat hinzufügen,
     Dokumentanalyse und Attachments im Chat
   - Deep Research bzw. Recherchemodus end-to-end
   - Notebooks/Arbeitsbereiche, Agent-/Command-Suche und relevante Chat-Aktionen
   - mobile/responsive Kernansicht, sofern ohne zusätzliche Credentials möglich
   Verwende keine Fake-Erfolgstexte. Ein sichtbares UI allein ist kein Beweis;
   prüfe echte Resultate, Requests/Status und Fehlermeldungen.
8. `sin-chrome doctor` war grün, aber `sin-chrome-control status` timed out,
   während der Mac-i9-Tunnel und Orca liefen. Prüfe den Befund erneut. Wenn er
   reproduzierbar ist, erstelle oder aktualisiere im Repo
   `/Users/jeremy/dev/wow-my-zsh` ein GitHub-Issue mit exakter Reproduktion,
   ohne Credentials, und vermerke URL/Status im OpenSIN-Taskplan.
9. Nach jedem Meilenstein aktualisiere beide Taskplan-Datenbanken. Jede nicht
   behobene Funktion, jeder externe Blocker, fehlende Credential-/Provider-
   Zugriff und jeder nicht ausgeführte Test bekommt eine eigene Aufgabe oder
   einen klaren Blocker mit nächstem Schritt. Keine Completion-Behauptung ohne
   frische Evidenz.

## Bestehende Konversations-Historie

- Voriger OpenAfD-CEO-Chat: `https://chatgpt.com/c/6a71920a-27c0-83ed-a6f1-82f8577423a8`
- Voriger OpenSIN-CEO-Chat: `https://chatgpt.com/c/6a70be0a-e66c-83ed-ad27-37541b1ab12d`
- Der Delegationslauf muss aus dem gelieferten vorherigen Chat branch-first
  eine neue Konversation erzeugen. Bestätige danach den neuen kurzen Titel und
  die kanonische URL. Archiviere den Quellchat erst nach dieser Bestätigung;
  falls die UI das nicht sicher erlaubt, lasse ihn bestehen und dokumentiere
  den Grund.

## Abschlussbericht

Melde am Ende knapp: neuer Chat-Titel und kanonische URL, Task-ID/Runde,
Repository, letzter Status, Commit-SHAs, Testbefehle mit Ergebnissen, OCI-
Release-/Health-Evidenz, Browser-Matrix, behobene Fehler, offene Aufgaben und
exakte externe Blocker. Sende danach den vorgesehenen `sin-orca web-callback-send`
Callback mit `done`, `blocked` oder `failed`; der Callback ist nur ein Wecksignal,
die lokale Prüfung folgt separat.
