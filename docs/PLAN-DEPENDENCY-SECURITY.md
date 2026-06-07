# Plan: Dependency Security Hardening (Phase 4)

## Ziel

Eliminiere die **484 npm-Vulnerabilities** in den Server- und Frontend-Workspaces durch Major-Bumps der direkten Dependencies (Strategie 2). Kein `resolutions`-Wildwuchs, sondern saubere Major-Version-Updates mit Code-Review.

## Ausgangslage (Audit 2026-06-07)

```
server:   406 advisories, 38 unique packages  (39 critical, 176 high, 191 moderate)
frontend:  91 advisories, 25 unique packages  ( 2 critical,  27 high,  62 moderate)
total:    497 advisories
```

### Top-Vuln-Pakete (Server)

| Paket | Total | Crit | High | Mod | Gezogene durch (direct dep) |
|-------|------:|-----:|-----:|-----|------------------------------|
| fast-xml-parser | 161 | 30 | 71 | 60 | SSE-Stream-Parser, cheerio |
| protobufjs | 45 | 5 | 20 | 20 | onnxruntime-web (via @xenova/transformers) |
| axios | 25 | 0 | 14 | 11 | mehrere provider |
| picomatch | 20 | 0 | 10 | 10 | glob, viele |
| uuid | 17 | 0 | 0 | 17 | direct + transitive |
| langsmith | 12 | 0 | 4 | 8 | langchain |
| undici | 12 | 0 | 5 | 7 | node-fetch, alle fetch-Libs |
| tar-fs | 12 | 0 | 12 | 0 | adm-zip, multer |
| brace-expansion | 12 | 0 | 0 | 12 | minimatch, glob |
| lodash | 12 | 0 | 4 | 8 | dompurify, chart.js, @tremor |
| multer | 5 | 0 | 5 | 0 | **direct** (`multer 2.0.0`) |
| convict | 4 | 4 | 0 | 0 | **direct** |

### Top-Vuln-Pakete (Frontend)

| Paket | Total | Crit | High | Mod |
|-------|------:|-----:|-----:|----:|
| vite | 13 | 0 | 1 | 12 |
| dompurify | 10 | 0 | 0 | 10 |
| minimatch | 9 | 0 | 9 | 0 |
| protobufjs | 9 | 1 | 4 | 4 |
| @babel/runtime | 7 | 0 | 0 | 7 |

## Strategie

**Major-Bumps** der direkten Dependencies in fester Reihenfolge:
1. **Phase 4.0**: Resolutions-Block aufräumen (was schon da ist, behalten)
2. **Phase 4.1**: Frontend-Low-Hanging-Fruits (vite, dompurify, vitest)
3. **Phase 4.2**: Express 4 → 5 (existierendes #17)
4. **Phase 4.3**: Cheerio 1.0 → 1.2 (existierendes #19)
5. **Phase 4.4**: OpenAI SDK 4.95 → 6.x (existierendes #15)
6. **Phase 4.5**: Jest 29 → 30 (existierendes #13)
7. **Phase 4.6**: LangChain-Ecosystem bump (0.1.x → 0.3.x)
8. **Phase 4.7**: multer 2.0 → 2.1 (5 HIGH → 0)
9. **Phase 4.8**: conv. minor bumps (uuid, lodash, axios)
10. **Phase 4.9**: adm-zip 0.5.16 → 0.5.17 (existierendes #16)
11. **Phase 4.10**: Re-audit + letzte Lücken schließen

Jede Phase:
- 1-2 isolierte Commits
- Lint + Test + Audit-Check
- Falls breaking: extra Issue + separater Workstream

## Phase-Details

### Phase 4.1 — Frontend Low-Hanging-Fruits
- vite ^5 → ^6 (12 moderate → 0, kein breaking für uns)
- dompurify 3.3.3 → 3.3.4 (10 moderate → 0, patch)
- vitest (1 critical → 0)
- yarn install + vitest grün

### Phase 4.6 — LangChain Ecosystem (aufwendigste Phase)
- `langchain 0.1.36` → `^0.3.0` (breaking: Agent-Executor API)
- `@langchain/core 0.1.61` → `^0.3.0` (breaking: Message types)
- `@langchain/anthropic 0.1.16` → `^0.3.0`
- `@langchain/aws 0.0.5` → `^0.1.0`
- `@langchain/cohere 0.0.11` → `^0.3.0`
- `@langchain/community 0.0.53` → `^0.3.0`
- `@langchain/openai 0.0.28` → `^0.3.0`
- `@langchain/textsplitters 0.0.0` → `^0.1.0`
- Code-Touch: `server/utils/agents/aibitat/providers/*`, `server/utils/agents/aibitat/index.js`
- Test-Touch: provider tests
- Erwarteter Aufwand: 4-6h, breaking

### Phase 4.7 — multer 2.0 → 2.1
- 5 HIGH → 0 (CVE-2025-47935 + Co: path traversal, DoS)
- 1-Zeilen-Change in package.json
- yarn install + Lint grün

### Phase 4.10 — Re-audit
- `yarn audit --level high` (root, server, frontend)
- Erwartet: 0 high/critical
- Moderate/low dokumentiert + ticket falls security-relevant

## Aufwand-Schätzung

| Phase | Aufwand | Breaking | Risiko |
|-------|--------:|:--------:|-------:|
| 4.0 (resolutions) | 10 min | nein | niedrig |
| 4.1 (vite, dompurify) | 30 min | nein | niedrig |
| 4.2 (express 5) | 2 h | **ja** | mittel |
| 4.3 (cheerio) | 1 h | minimal | niedrig |
| 4.4 (openai 6) | 1 h | **ja** | mittel |
| 4.5 (jest 30) | 1 h | **ja** | mittel |
| 4.6 (langchain) | 6 h | **ja** | hoch |
| 4.7 (multer) | 15 min | nein | niedrig |
| 4.8 (minor) | 1 h | nein | niedrig |
| 4.9 (adm-zip) | 10 min | nein | niedrig |
| 4.10 (re-audit) | 30 min | n/a | n/a |
| **TOTAL** | **~13 h** | | |

## NICHT enthalten (Out of Scope)

- Source-Code-Security-Audit (z.B. SSRF, IDOR) — separates Projekt
- CSP / Permissions-Policy — separates Projekt
- Container-Scanning (Trivy) — separates Projekt
- SBOM-Update — automatisch via `sin-code sbom`

## Erfolg-Kriterien

- [ ] `yarn audit --level high` (root, server, frontend) → 0 vulns
- [ ] Alle Tests grün (server: 225/225, frontend: alle vitest)
- [ ] Lint grün
- [ ] CI: Branding Lint ✓, Tests ✓, CEO Audit ✓
- [ ] Keine offenen Dependabot-PRs für HIGH-Vulns

## Issue-Verweise

- #13 — jest 30 (geplant in Phase 4.5)
- #15 — openai 6 (geplant in Phase 4.4)
- #16 — adm-zip 0.5.17 (geplant in Phase 4.9)
- #17 — express 5 (geplant in Phase 4.2)
- #18 — milvus 3 (außerhalb Scope — kein Vuln-Trigger)
- #19 — cheerio 1.2 (geplant in Phase 4.3)
- Neue Issues: #38-#44 für Phasen 4.0, 4.1, 4.6, 4.7, 4.8, 4.10
