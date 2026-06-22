<!-- SPDX-License-Identifier: MIT -->

# OpenSIN-Chat — Backlog

> **Status:** ARCHIVIERT / AKTIV VERLAGERT — Diese Datei wird nicht mehr gepflegt.
> **Aktuelle Planung:** [`PLAN.md`](./PLAN.md) und [`docs/PLAN-PRODUCTION-READINESS.md`](./docs/PLAN-PRODUCTION-READINESS.md)
> **Offene GitHub Issues:** 0
> **Letztes Update:** 2026-06-22

---

## Hinweis

Der ursprüngliche Inhalt dieses Backlogs (Stand 2026-06-06) ist weitgehend erledigt. Die aktive Arbeit wird nun zentral in den Plan-Dokumenten geführt:

- **Kurzfristige Arbeit** (i18next, PDF Hardening, Build Cleanup, launchd, alte Issues) → [`PLAN.md`](./PLAN.md)
- **Mittel- bis langfristige Produktionsreife** (Testing, Data Sync, Resilience, Endpoints, Scale, Dependencies) → [`docs/PLAN-PRODUCTION-READINESS.md`](./docs/PLAN-PRODUCTION-READINESS.md)

## Aktueller Code-Status

- ESLint: **0 Errors, 0 Warnings**
- `vite build`: **Exit 0**
- `yarn audit`: **0 vulns** (root, server, frontend)
- Alle offenen GitHub-Issues geschlossen
- `main` auf dem neuesten Stand

## Historische Einträge (erledigt)

Die folgenden Punkte aus dem Backlog vom 2026-06-06 sind abgeschlossen:

- ✅ `console.log` aus Produktions-Code entfernt
- ✅ Hardcodierte Placeholder zu i18n migriert
- ✅ TODO-Kommentare adressiert
- ✅ Unit-Test-Infrastruktur eingerichtet (Vitest + Testing Library)
- ✅ Vite Chunk-Size-Warning behoben (manualChunks)
- ✅ DE-Lokalisierung verifiziert
- ✅ Dependency-Updates (express, openai, actions)
- ✅ SBOM generiert
- ✅ License-Header ergänzt
- ✅ CEO Audit abgeschlossen (Grade A)
- ✅ Politician Sync Job implementiert
- ✅ SIN-Browser-Tools integriert
- ✅ Phase 9: Security & Operations Hardening abgeschlossen (2026-06-22)

---

*Diese Datei bleibt als Archiv bestehen. Für neue Arbeit bitte die aktiven Plan-Dokumente nutzen.*
