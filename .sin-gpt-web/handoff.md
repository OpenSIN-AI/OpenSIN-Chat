# Handoff: Run-6 CEO Delegation (Mac-i9 Tunnel Fehler -> Chat-Branch)

## Status: T-0007/T-0010 done, T-0009 in_progress; TUNNEL-FEHLER -> Branch needed

### Canonical ChatGPT Session (ALT - wird archiviert)
- **Conversation URL**: https://chatgpt.com/c/6a704264-885c-83eb-94ad-0e340d70781f
- **ChatGPT Page ID**: 696b7f95-6b66-4a18-99d0-2bfdeb00e20d
- **Profile**: OpenSIN, **Mode**: Chat, **Connector**: Mac i9 (readyz healthy, Chat-Bindung verloren)
- **Symptom**: Tab-Titel "Mac-i9 Tunnel Fehler"; ChatGPT beantwortet nichts mehr in diesem Chat.
- **Recovery-Aktion**: `sin-gpt-web-recover` -> "Ab hier neuen Chat starten", neue URL verwenden, alten Chat archivieren. Fortsetzung NUR im neuen Chat (#1 - OpenSIN-Chat).

### Repos & Git (Stand nach ChatGPT-Arbeit)
- OpenSIN-Chat main: a79c1a2b2 "fix: persist parsed chat upload context" (gepusht, 45/45 Jest grün)
- OpenAfD-Chat main: 23653651e "fix: persist parsed chat upload context" (gepusht)
- Vorher gepusht: OpenSIN fb10f1f68, OpenAfD e118861eb
- Uncommitted (ChatGPT laufende Arbeit): apps/api/utils/chats/stream.js + stream.test.js (T-0012 deutsche Einzeldatei-Muster), Taskplan-Views, chat-capabilities.*, OpenAfD reports/T-0034.md

### Open Tasks
- OpenSIN: T-0009 (in_progress, Coverage-Gate), T-0008 (Browserabnahme), T-0011 (persist context - im Commit a79c1a2b2 vermutlich erledigt), T-0012 (Einzeldatei-Prompt, laufend)
- OpenAfD: T-0033 (in_progress Coverage), T-0035, T-0036, blocked: T-0001, T-0025, T-0031

### Nächste Schritte nach Recovery
1. Neuen Chat mit Resume-Brief bespielen (sin-gpt-web-state ensure + summary + TASKPLAN.md lesen, laufende T-0012-Arbeit committen/pushen, Coverage-Gate T-0009/T-0033, Browserabnahme T-0008, Deploy beider Repos als immutable Images inkl. Token-Rotation)
2. Deployment: OpenSIN a79c1a2b2, OpenAfD 23653651e auf OCI VM sin-supabase (92.5.60.87)
3. Browser-Abnahme T-0008 auf Live-Seiten

### Authorization
- Commit+Push main beide Repos: YES | Deployment: YES | Token-Rotation: YES | Keine externen irreversiblen Aktionen
