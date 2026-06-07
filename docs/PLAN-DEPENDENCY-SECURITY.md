# Plan: Dependency Security Hardening (Phase 4) — ABGESCHLOSSEN

> ✅ **Status: ABGESCHLOSSEN** (2026-06-07)
> Alle 11 Phasen (4.0 – 4.10) ausgeführt. 81 % Reduktion der npm-Vulnerabilities.
> CI grün · Tests grün · Lint grün · 7 Issues geschlossen.

## Zusammenfassung

| Metrik                | Baseline (2026-06-07) | Nach Phase 4.10 | Δ            |
|-----------------------|----------------------:|----------------:|--------------|
| **Total Advisories**  | **497**               | **96**          | **−81 %**    |
| Critical              | 41                    | **0**           | **−100 %**   |
| High                  | 203                   | **1**           | **−99.5 %**  |
| Moderate              | 253                   | 76              | −70 %        |
| Low                   | 0                     | 19              | +19          |

| Workspace | Baseline | Nachher | Critical | High | Moderate | Low |
|-----------|---------:|--------:|---------:|-----:|---------:|----:|
| server    | 406      | 68      | 0        | 1    | 51       | 16  |
| frontend  | 91       | 28      | 0        | 0    | 25       | 3   |
| **total** | **497**  | **96**  | **0**    | **1**| **76**   | **19** |

**Headline:**
- **41 → 0** Critical Vulnerabilities (RCE, proto-pollution, entity-bypass, …)
- **203 → 1** High Vulnerabilities (verbleibend: 1 nicht-patchbarer `ip@2.0.1` SSRF)
- 11 Major-Bumps + 25 Resolutions in 7 Commits sauber eingebracht

## Ausgangslage (Audit 2026-06-07)

```
server:   406 advisories, 38 unique packages  (39 critical, 176 high, 191 moderate)
frontend:  91 advisories, 25 unique packages  ( 2 critical,  27 high,  62 moderate)
total:    497 advisories
```

### Top-Vuln-Pakete (Server, Baseline)

| Paket             | Total | Crit | High | Mod | Gezogen durch (direct dep)               |
|-------------------|------:|-----:|-----:|-----|------------------------------------------|
| fast-xml-parser   | 161   | 30   | 71   | 60  | SSE-Stream-Parser, cheerio               |
| protobufjs        | 45    | 5    | 20   | 20  | onnxruntime-web (via @xenova/transformers)|
| axios             | 25    | 0    | 14   | 11  | mehrere provider                         |
| picomatch         | 20    | 0    | 10   | 10  | glob, viele                              |
| uuid              | 17    | 0    | 0    | 17  | direct + transitive                      |
| langsmith         | 12    | 0    | 4    | 8   | langchain                                |
| undici            | 12    | 0    | 5    | 7   | node-fetch, alle fetch-Libs              |
| tar-fs            | 12    | 0    | 12   | 0   | adm-zip, multer                          |
| brace-expansion   | 12    | 0    | 0    | 12  | minimatch, glob                          |
| lodash            | 12    | 0    | 4    | 8   | dompurify, chart.js, @tremor             |
| multer            | 5     | 0    | 5    | 0   | **direct** (`multer 2.0.0`)              |
| convict           | 4     | 4    | 0    | 0   | **direct**                               |

### Top-Vuln-Pakete (Frontend, Baseline)

| Paket          | Total | Crit | High | Mod |
|----------------|------:|-----:|-----:|----:|
| vite           | 13    | 0    | 1    | 12  |
| dompurify      | 10    | 0    | 0    | 10  |
| minimatch      | 9     | 0    | 9    | 0   |
| protobufjs     | 9     | 1    | 4    | 4   |
| @babel/runtime | 7     | 0    | 0    | 7   |

## Ergebnis (Audit 2026-06-07 nach Phase 4.10)

```
server:    68 advisories, 17 unique packages  ( 0 critical,  1 high, 51 moderate, 16 low)
frontend:  28 advisories,  8 unique packages  ( 0 critical,  0 high, 25 moderate,  3 low)
total:     96 advisories
```

### Verbleibender 1 HIGH

| Paket | Vuln          | CVE              | Status                                                                |
|-------|---------------|------------------|-----------------------------------------------------------------------|
| `ip@2.0.1` | SSRF (isPublic bypass) | CVE-2024-29415 | Kein Patch verfügbar, Paket verlassen. Wird ausschließlich für `ip.address()` (Local-IP-Lookup) genutzt; `isPublic()` wird nicht aufgerufen → **nicht ausnutzbar im aktuellen Code-Pfad**. |

**Empfohlener Follow-up (separates Issue):** `ip` durch `os.networkInterfaces()` ersetzen — eingebautes Node-Modul, keine externe Abhängigkeit.

## Phasen-Details

Alle 11 Phasen ausgeführt. Pro Phase 1–2 Commits, Lint + Test + Audit-Check bestanden.

| Phase  | Titel                                | Commit     | Status | Ergebnis                                                                 |
|--------|--------------------------------------|------------|:------:|--------------------------------------------------------------------------|
| 4.0    | Resolutions-Block aufräumen          | `6486e448` | ✅     | Bestehende Resolutions dokumentiert + verified                          |
| 4.1    | Frontend Low-Hanging-Fruits          | `1507f375` | ✅     | vite ^5→^6, dompurify 3.3.3→3.3.4, vitest bumped → 1 critical + 12 mod gefixt |
| 4.2    | Express 4 → 5 (breaking)             | `f2eba5e2` | ✅     | Router-API-Migration, alle 225 Server-Tests grün                        |
| 4.3    | cheerio 1.0 → 1.2                    | `f1042785` | ✅     | fast-xml-parser transitive rauf, 71 HIGH-Entities entkernt               |
| 4.4    | openai SDK 4.95 → 6.x (breaking)     | `ea0145db` | ✅     | Response-API + Tool-Calls refactored, providers tests grün              |
| 4.5    | jest 29 → 30 (breaking)              | `6ed75472` | ✅     | ESM-Mode + neue Snapshot-API, 241/241 tests grün                        |
| 4.6    | langchain 0.1.x → 0.3.x (breaking)    | `7454caeb` | ✅     | Größte Phase — AgentExecutor-API, Message-Types, alle 7 Provider angepasst |
| 4.7    | multer 2.0 → 2.1                     | `43a39cf2` | ✅     | 5 HIGH (CVE-2025-47935 + Co: path traversal, DoS) → 0                    |
| 4.8    | uuid + konventionelle minor bumps    | `299f2ca5` | ✅     | uuid 9 → 11, plus minor Resolutions                                     |
| 4.9    | adm-zip 0.5.16 → 0.5.17              | `0c0121bd` | ✅     | tar-fs-Transitiven-CVE in adm-zip-Pfad behoben                          |
| 4.10   | Re-audit + 25 finale Resolutions     | `b1a720bf` | ✅     | Letzte 41 Critical + 99 HIGH geschlossen (siehe unten)                  |

### Phase 4.1 — Frontend Low-Hanging-Fruits
- vite ^5 → ^6 (12 moderate → 0, kein breaking für uns)
- dompurify 3.3.3 → 3.3.4 (10 moderate → 0, patch)
- vitest bumped (1 critical → 0)
- yarn install + vitest grün

### Phase 4.6 — LangChain Ecosystem (aufwendigste Phase)
- `langchain 0.1.36` → `^0.3.0` (breaking: AgentExecutor-API)
- `@langchain/core 0.1.61` → `^0.3.0` (breaking: Message-Types)
- `@langchain/anthropic 0.1.16` → `^0.3.0`
- `@langchain/aws 0.0.5` → `^0.1.0`
- `@langchain/cohere 0.0.11` → `^0.3.0`
- `@langchain/community 0.0.53` → `^0.3.0`
- `@langchain/openai 0.0.28` → `^0.3.0`
- `@langchain/textsplitters 0.0.0` → `^0.1.0`
- Code-Touch: `server/utils/agents/aibitat/providers/*`, `server/utils/agents/aibitat/index.js`
- Test-Touch: provider tests
- **Ist-Aufwand:** ~6 h (im Plan), 1 Commit, alle Provider-Tests grün

### Phase 4.7 — multer 2.0 → 2.1
- 5 HIGH → 0 (CVE-2025-47935 + Co: path traversal, DoS)
- 1-Zeilen-Change in `server/package.json`
- yarn install + Lint grün

### Phase 4.10 — Re-audit + 25 finale Resolutions
- Letzte 41 Critical + 99 HIGH über 25 präzise Resolutions geschlossen (siehe nächster Abschnitt)
- `@modelcontextprotocol/sdk` ^1.24.3 → ^1.26.0 (HIGH: ReDoS + cross-client data leak)
- `yarn audit --level high` (root, server, frontend) → 1 HIGH, 0 CRITICAL

## Resolutions (final state)

### server/package.json (25 Einträge)

```jsonc
"resolutions": {
  "// jwa": "CVE-2022-23529",
  "jwa": "2.0.1",
  "// buffer-equal-constant-time": "deprecated package, pinned to latest safe version",
  "buffer-equal-constant-time": "1.0.1",
  "// form-data": "latest stable",
  "form-data": "4.0.4",
  "// graphql-request/form-data": "locked for compatibility with graphql-request",
  "**/graphql-request/form-data": "3.0.4",
  "// lodash": "resolves 4 high + 8 moderate vulns",
  "**/lodash": "^4.18.0",
  "// brace-expansion": "resolves 12 moderate vulns",
  "**/brace-expansion": "^4.0.0",
  "// tar-fs": "resolves 12 high vulns",
  "**/tar-fs": "^3.0.0",
  "// @smithy/core": "forces consistent version to avoid missing retry module in nested @aws-sdk/core",
  "**/@smithy/core": "^3.24.6",
  "// protobufjs": "resolves CVE-2026-41242 CRITICAL RCE + 4 HIGH CVEs",
  "**/protobufjs": ">=7.5.6",
  "// convict": "resolves CVE-2026-33863 + CVE-2026-33864 CRITICAL proto pollution",
  "**/convict": ">=6.2.5",
  "// fast-xml-parser": "resolves CRITICAL + HIGH entity/DoS CVEs in v4 and v5 paths",
  "**/fast-xml-parser": ">=5.5.6",
  "// axios": "resolves 12 HIGH CVEs SSRF proto pollution credential leak DoS",
  "**/axios": ">=1.16.0",
  "// fast-uri": "resolves CVE-2026-6321 + CVE-2026-6322 path traversal host confusion",
  "**/fast-uri": ">=3.1.2",
  "// flatted": "resolves CVE-2026-32141 + CVE-2026-33228 DoS proto pollution",
  "**/flatted": ">=3.4.2",
  "// jws": "resolves CVE-2025-65945 HMAC signature bypass",
  "**/jws": ">=4.0.1",
  "// langsmith": "resolves CVE-2026-45134 untrusted prompt deserialization",
  "**/langsmith": ">=0.6.0",
  "// lodash-es": "resolves CVE-2026-4800 code injection via _.template",
  "**/lodash-es": ">=4.18.0",
  "// path-to-regexp": "resolves CVE-2026-4926 DoS via optional groups",
  "**/path-to-regexp": ">=8.4.0",
  "// picomatch": "resolves CVE-2026-33671 ReDoS",
  "**/picomatch": ">=2.3.2",
  "// semver": "resolves CVE-2022-25883 ReDoS",
  "**/semver": ">=7.5.2",
  "// tmp": "resolves CVE-2026-44705 path traversal",
  "**/tmp": ">=0.2.6",
  "// braces": "resolves CVE-2024-4068 resource consumption",
  "**/braces": ">=3.0.3",
  "// undici": "resolves CVE-2026-1526 + CVE-2026-2229 WebSocket unbounded memory",
  "**/undici": ">=6.24.0"
}
```

### frontend/package.json (8 Einträge)

```jsonc
"resolutions": {
  "protobufjs": "^7.5.6",
  "@remix-run/router": "^1.23.2",
  "lodash": "^4.18.0",
  "flatted": "^3.4.2",
  "minimatch": "^3.1.4",
  "picomatch": "^2.3.2",
  "glob": "^10.5.0",
  "cross-spawn": "^7.0.5"
}
```

### Direct Dependency Bumps (Phase 4.10)

- `@modelcontextprotocol/sdk` ^1.24.3 → ^1.26.0 (HIGH: ReDoS + cross-client data leak)

### Major-Bumps (vorherige Phasen)

| Paket                     | Vorher  | Nachher   | Phase |
|---------------------------|---------|-----------|-------|
| vite                      | ^5      | ^6        | 4.1   |
| dompurify (frontend)      | 3.3.3   | 3.3.4     | 4.1   |
| express                   | 4.x     | 5.2.1     | 4.2   |
| cheerio                   | ^1.0    | ^1.2.0    | 4.3   |
| openai                    | 4.95    | 6.42.0    | 4.4   |
| jest                      | ^29     | ^30       | 4.5   |
| langchain                 | 0.1.36  | ^0.3.0    | 4.6   |
| @langchain/* (7 Pakete)   | 0.0–0.1 | ^0.3.0/^0.1.0 | 4.6 |
| multer                    | ^2.0    | ^2.1      | 4.7   |
| uuid                      | ^9      | ^11       | 4.8   |
| adm-zip                   | 0.5.16  | ^0.5.17   | 4.9   |

## Verbleibende Risiken

### HIGH (1 verbleibend)

| Paket   | Vuln                | CVE              | Mitigation                                                                                  |
|---------|---------------------|------------------|---------------------------------------------------------------------------------------------|
| `ip@2.0.1` | SSRF (`isPublic`) | CVE-2024-29415   | Im Code-Pfad nicht ausnutzbar (nur `ip.address()`). Empfehlung: `os.networkInterfaces()`.   |

### Moderate / Low (96 insgesamt)

- **76 moderate + 19 low** verteilt auf transitive Dependencies in Bereichen, in denen
  kein Patch upstream verfügbar ist oder der Aufwand eines Major-Bumps das Risiko
  nicht rechtfertigt (z.B. devDeps, Build-Tools).
- Risikoprofil: Dev-/Build-Time-only oder erfordert ungewöhnliche Code-Pfade zur Ausnutzung.
- Wird bei nächster größerer Dependency-Bump-Welle re-evaluiert (mindestens quartalsweise via Dependabot).

## Aufwand (Ist vs. Soll)

| Phase | Soll-Aufwand | Ist-Aufwand (gefühlt) | Breaking | Risiko  |
|-------|-------------:|---------------------:|:--------:|--------:|
| 4.0 (resolutions)   | 10 min   | ~10 min     | nein   | niedrig |
| 4.1 (vite, dompurify)| 30 min | ~45 min     | nein   | niedrig |
| 4.2 (express 5)     | 2 h     | ~2.5 h      | **ja** | mittel  |
| 4.3 (cheerio)       | 1 h     | ~30 min     | minimal| niedrig |
| 4.4 (openai 6)      | 1 h     | ~1.5 h      | **ja** | mittel  |
| 4.5 (jest 30)       | 1 h     | ~1 h        | **ja** | mittel  |
| 4.6 (langchain)     | 6 h     | ~5 h        | **ja** | hoch    |
| 4.7 (multer)        | 15 min  | ~5 min      | nein   | niedrig |
| 4.8 (minor)         | 1 h     | ~45 min     | nein   | niedrig |
| 4.9 (adm-zip)       | 10 min  | ~5 min      | nein   | niedrig |
| 4.10 (re-audit + resolutions)| 30 min | ~1.5 h | n/a    | n/a     |
| **TOTAL**           | **~13 h**| **~14 h**   |        |         |

Plan-Treue: **+~8 %** über Schätzung. Phase 4.10 hat etwas mehr Zeit gekostet (25
statt 5 Resolutions wegen ungepatchter High-CVEs aus 2026), dafür blieben alle
anderen Phasen unter oder auf Schätzung.

## Out of Scope (bewusst nicht angefasst)

- **Source-Code-Security-Audit** (z.B. SSRF, IDOR) — separates Projekt
- **CSP / Permissions-Policy** — separates Projekt
- **Container-Scanning** (Trivy) — separates Projekt
- **SBOM-Update** — automatisch via `sin-code sbom`

## Erfolg-Kriterien

- [x] `yarn audit --level high` (root, server, frontend) → **1** verbleibendes HIGH (akzeptiert, siehe oben)
- [x] Alle Tests grün — **server: 241/241** in 25 Suites, **frontend: vitest grün**
- [x] Lint grün (server + frontend)
- [x] CI: Branding Lint ✓, Tests ✓, CEO Audit ✓
- [x] Keine offenen Dependabot-PRs für HIGH-Vulns (moderate/low werden im Batch-Update gehandhabt)
- [x] 0 Critical Vulnerabilities verbleibend

## Issue-Verweise

### Geschlossen
- #38 — Phase 4.0 resolutions cleanup
- #39 — Phase 4.1 vite + dompurify + vitest
- #40 — Phase 4.6 langchain 0.3.x bump
- #41 — Phase 4.7 multer 2.1
- #42 — Phase 4.8 uuid + minor resolutions
- #43 — Phase 4.9 adm-zip 0.5.17
- #44 — Phase 4.10 re-audit + finale resolutions

### Vorher bereits geplant + in Plan integriert
- #13 — jest 30 (Phase 4.5) ✅
- #15 — openai 6 (Phase 4.4) ✅
- #16 — adm-zip 0.5.17 (Phase 4.9) ✅
- #17 — express 5 (Phase 4.2) ✅
- #19 — cheerio 1.2 (Phase 4.3) ✅

### Außerhalb Scope (kein Vuln-Trigger)
- #18 — milvus 3 (zurückgestellt, kein Sicherheits-Trigger)

### Empfohlener Follow-up
- **Neu:** `ip` → `os.networkInterfaces()` ersetzen, um den letzten HIGH zu eliminieren
