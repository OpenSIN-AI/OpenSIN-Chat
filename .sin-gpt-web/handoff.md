# Handoff: Run-6 CEO Delegation (Mac-i9 Tunnel Fehler -> Chat-Branch)

## Status: ALLE Tasks done (OpenSIN done=12, OpenAfD done=33); beide Repos deployed+verifiziert; T-0008 abgeschlossen

### Kanonischer ChatGPT-Chat (AKTIV)
- **Conversation URL**: https://chatgpt.com/c/6a70508f-569c-83eb-af07-9382d4f26ee3
- **Chat-Titel**: "#1 - OpenSIN-Chat" (umbenannt 2026-08-03, in Sidebar verifiziert)
- **Profile**: OpenSIN, **Mode**: Chat
- Recovery abgeschlossen: Alter Chat 6a704264 ("Mac-i9 Tunnel Fehler") ist ARCHIVIERT (UI: "Das Gespräch ist archiviert"). Siehe `.sin-gpt-web/chat-recovery.json` (Counter #1).

### Repos & Git (Stand 2026-08-03, alles gepusht)
- OpenSIN-Chat main: 05d984d0b "docs(taskplan): complete T-0008 with fresh post-deploy browser acceptance"
- OpenAfD-Chat main: e217bee02 "docs(taskplan): record post-deploy reload-persistence proof for T-0035"
- Fix (beide): f85dd1537 / 5afa5604a "fix(api): persist exact single-attachment turns in thread history" (include:true, 43/43 Jest grün)

### Live-Deployment (OCI VM 92.5.60.87, verifiziert)
- opensin-app: Image opensin-app:f85dd1537, health=healthy, public /api/ping online:true
- openafd-app: Image openafd-app:5afa5604a, health=healthy, public /api/ping online:true
- Cutover: docker rename alter Container -> legacy (Rollback möglich), compose up --no-build, interne+öffentliche Health-Pruefung, Legacy-Container: opensin-app-legacy-20260803T104406Z / openafd-app-legacy-20260803T104954Z (koennen entfernt werden)
- Release-Worktrees auf VM: /home/ubuntu/releases/OpenSIN-Chat (f85dd1537), /home/ubuntu/releases/OpenAfD-Chat (5afa5604a); git checkout main schlaegt fehl (worktree-Konflikt), git merge --ff-only origin/main funktioniert
- Build: docker compose build in platform/containers/compose mit OPENSIN_IMAGE_TAG=<sha>, OPENSIN_PORT: OpenSIN 38471 / OpenAfD 38472

### Live-Beweise (frisch, 2026-08-03)
- OpenSIN: Thread 031dae27, Prompt "Gib den vollständigen Inhalt der einzigen angehängten Datei exakt und ohne Zusatz aus." -> exakt FILE_OK_OPENSIN_LIVE_960EEF_R2, 1 Quelle; Reload zeigt Nachricht (vorher leer); DB chat 105 include=1
- OpenAfD: Thread f84e12e5, gleicher Prompt -> exakt FILE_OK_OPENAFD_LIVE_285C67_R2, 1 Quelle; Reload zeigt Nachricht; DB chat 13 include=1
- ⌘K-Suche: Treffer auf round2-opensin-live-960eef.txt; Modellwahl: 10 NIM-Modelle, nemotron-nano-12b-v2-vl aktiv; Deep-Research-UI: @agent [deep-research] [sources:web-search]
- Screenshots: OpenSIN/.local/browser-acceptance/round2-opensin-t0012-reload-persist-live.png, round2-opensin-cmdk-search-live.png; OpenAfD/.local/browser-acceptance/round2-openafd-t0035-reload-persist-live.png

### Open Tasks
- Keine offenen Tasks. OpenSIN done=12, OpenAfD done=33. blocked (extern, beide Repos): OpenAfD T-0001 (Key-Rotation), T-0031 (Deep-Research-Hang), wow-my-zsh sin-chrome Issue #29
- Legacy-Container auf der VM entfernt (existierten bereits nicht mehr; aktiv: opensin-app:f85dd1537, openafd-app:5afa5604a, beide healthy; Rollback jederzeit ueber die alten per-Commit-Images)

### Authorization
- Commit+Push main beide Repos: YES | Deployment: YES | Token-Rotation: YES | Keine externen irreversiblen Aktionen
