# Vercel Build Fix

## Problem
Vercel führt `vite build` im Repo-Root aus, aber die Vite-App liegt in `frontend/`.
Fehler: `[UNRESOLVED_ENTRY] Cannot resolve entry module index.html`

## Lösung
Erstelle `vercel.json` im Root mit korrektem Build-Pfad:

```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist"
}
```

## Status
- [x] vercel.json hinzufügen
- [ ] Test-Deploy triggern
- [ ] Bestätigen, dass Build erfolgreich läuft

## Kontext
OpenSIN-Chat ist eine selbst-gehostete Full-Stack-App (inspiriert von AnythingLLM, mittlerweile eigenständig):
- Frontend: Vite-SPA in `frontend/` mit eigenem `vite.config.js`
- Backend: Node-Server in `server/`
- Collector: Python-Service in `collector/`

Das Deployment auf Vercel ist für das Frontend-Bauen gedacht, aber das Backend läuft selbst-gehostet (Docker/Bare-Metal).
