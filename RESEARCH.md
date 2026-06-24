# RESEARCH.md — OpenSIN-Chat → OpenAfD-Chat Sync-Analyse

> Erstellt: 2026-06-21
> Status: Abgeschlossen
> Ziel: Vollständige Analyse der Unterschiede zwischen OpenSIN-Chat und OpenAfD-Chat,
> um alle Verbesserungen aus OpenSIN-Chat nach OpenAfD-Chat zu übertragen — mit
> OpenAfD-Branding statt OpenSIN-Branding.

---

## 1. Ausgangslage

### 1.1 Beide Repos

| Repo | GitHub URL | Commits | Letzter Commit | Rollen |
|---|---|---|---|---|
| **OpenSIN-Chat** | `github.com/OpenSIN-AI/OpenSIN-Chat` | 877 | 2026-06-21 | Hauptrepo, aktiv entwickelt |
| **OpenAfD-Chat** | `github.com/Family-Team-Projects/OpenAfD-Chat` | 357 | 2026-06-10 | AfD-Version, zuletzt vor 11 Tagen aktualisiert |

OpenSIN-Chat is now a sovereign, independent product for political research. While it may share architectural foundations with earlier work,
it is not a fork. It is a purpose-built platform developed by OpenSIN-AI.

### 1.2 Git-Verhältnis

- OpenSIN-Chat ist **520 Commits ahead** von OpenAfD-Chat
- OpenAfD-Chat hat **0 unique Commits** gegenüber OpenSIN-Chat
  → OpenAfD-Chat ist ein "eingefrorener" Stand von OpenSIN-Chat
- Die Repos teilen sich denselben initialen Commit (`4d79a70e`)

### 1.3 Datei-Diff (gesamt)

| Kategorie | Anzahl |
|---|---|
| Dateien nur in OpenSIN (neu hinzugefügt) | 465 |
| Dateien nur in OpenAfD (in OpenSIN entfernt) | 194 |
| In beiden Repos modifiziert | 886 |
| **Gesamt geändert** | **1800 Dateien** |
| Zeilen eingefügt | +203.880 |
| Zeilen gelöscht | -134.878 |

---

## 2. Was OpenSIN-Chat hat, das OpenAfD-Chat NICHT hat

### 2.1 Neue Features (465 neue Dateien)

#### PDF-Analyse (komplettes Feature)
- `server/endpoints/pdfAnalysis.js` — Upload + Analyse-Endpoint
- `server/endpoints/api/pdfAnalysis/index.js` — API-Router
- `server/utils/pdfAnalysis/` — 35+ Dateien: OCR, Vision, Cross-Check, Corpus
- `frontend/src/models/pdfAnalysis.ts` — Frontend-Model
- `frontend/src/pages/PdfAnalysis/` — UI-Seite
- PDF-Analyse-Icon in RightSidebarIconBar

#### Politiker-Daten / Abgeordnetenwatch
- `server/utils/politician/` — Sync, Text-Search, Health-Check
- `frontend/src/pages/Admin/PoliticianSync/` — Admin-Seite
- `frontend/src/hooks/usePoliticians.js`, `usePoliticalData.js`, `useResearch.js`
- Politiker-Sidebar mit Daten vom Abgeordnetenwatch API (v2.9.0)
- `/settings/politician-sync` Route

#### Console Sidebar
- `frontend/src/components/WorkspaceChat/ChatContainer/ConsoleSidebar/` — Komplette Komponente
- Console-Icon in RightSidebarIconBar
- Live-Logs während Chat-Streaming

#### Text Size Menu
- `frontend/src/components/WorkspaceChat/ChatContainer/PromptInput/TextSizeMenu/` — Small/Normal/Large
- `openafd_text_size` localStorage key
- `textSizeChange` CustomEvent

#### Security & Middleware
- `server/utils/middleware/securityHeaders/` — CSP, HSTS, X-Frame-Options Headers
- `server/utils/middleware/simpleRateLimit/` — Rate-Limiting (429 Handler)
- `server/utils/middleware/requireAuthWhenOnboardingComplete.js`
- `server/endpoints/cspViolation.js` — CSP-Violation-Reporting
- `server/endpoints/providerStatus.js` — Provider-Health-Check

#### SSE-Streaming-Resilienz
- 45s Stall-Timer in `workspace.js` + `workspaceThread.ts`
- 429 Rate-Limit-Handler mit "Too many messages" + `Retry-After`
- `safeJson()` Helper für Cloudflare-HTML-Fallback
- Whitespace-Validierung in `useChatStream.js`

#### Mobile Layout
- `SidebarMobileHeader` in `WorkspaceChat` und `WorkspaceSettings`
- `useIsMobileLayout.ts` Hook
- Responsive Breakpoints für 375px

#### Unsaved-Changes-Warnung
- `frontend/src/hooks/useUnsavedChanges.js` — Neuer Hook
- `UnsavedChangesDialog` auf 8 Settings-Seiten

#### E2E-Tests (komplettes Test-Framework)
- `frontend/tests/e2e/` — 20 Playwright-Spec-Dateien
- `frontend/.playwright-tests/` — 12 weitere Test-Dateien
- Playwright-Config: `workers: 1`, `retries: 1`, gegen Produktion

#### CI/CD
- `ci/webhook-server.cjs` — Self-hosted CI Webhook-Receiver
- `ci/ci-webhook.service` — systemd Unit
- GitHub Webhook → VM → auto-deploy pipeline

#### Sonstige neue Features
- `server/utils/boundedJobStore/` — Bounded Job Store für Scheduled Jobs
- `server/utils/boot/logBootDiagnostics.js` — Boot-Diagnose
- `server/utils/chats/extractImageUrls.js` — Bild-URL-Extraktion
- `server/utils/helpers/validators.js`, `withTimeout.js`
- `frontend/src/pages/Docs/` — Interne Dokumentation (ADRs, API-Docs)
- `frontend/src/hooks/useFileBrowser.js` — Filesystem-Browser
- `frontend/src/hooks/useCustomSiteSettings.js`
- Image-Generation Agent-Plugin
- `frontend/src/pages/Admin/ExperimentalFeatures/features.ts`
- `frontend/src/components/WorkspaceChat/ChatContainer/DnDWrapper/` — Drag & Drop
- Session-Context-Injection (Open-Todos, Previous-Session-Summary, MEMORY.md)
- LLM-Selector `Cmd+Shift+L` Keyboard-Shortcut
- Stop-Generation-Button während Streaming
- `frontend/src/hooks/useChatHistory.js` — `useMemo` Fix für infinite loops
- `frontend/src/hooks/useWorkspaceChats.js` — `useMemo` Fix
- 37 neue Hooks (insgesamt)
- `vitest.config.js` — Test-Konfiguration
- 58 neue Test-Dateien (141 → 199 Test-Files)

### 2.2 Bug-Fixes (886 modifizierte Dateien)

#### Runde 1-9 (ca. 1100+ Bugs behoben)
- React `<option selected>` Warnings (28 Dateien)
- FireworksAi null apiKey crash
- API error handling, double URL encoding
- Political sidebar `/api/api/` double prefix
- Chat response positioning (15+ Fixes: Virtuoso, followOutput, scroll-to-bottom)
- Theme `useTheme()` → `useThemeContext()` (4 Komponenten)
- 10 Escape-Handler auf Modals/Dropdowns
- Temperature `max` + clamping
- WorkspaceModelPicker `z-30` pointer-events intercept
- Infinite re-render loop in `useChatHistory`
- Abgeordnetenwatch API v2.9.0 params
- PDF route mounting (`app` statt `apiRouter`)
- Multer error handling (HTML → JSON)
- Auth-Interceptor für `/pdf-analysis/`
- Console-Icon fehlte in RightSidebarIconBar
- TextSizeButton nie gerendert
- `Cmd+Shift+L` Dead Code
- Mobile Layout fehlt
- NewWorkspaceModal schließt nicht
- DeleteWorkspace Full-Page-Reload
- fetchPfp crash bei 404
- Whitespace-Nachrichten an Server → 400
- SSE hängt bei Netzwerkverlust → 45s Stall-Timer
- WebSocket loadingResponse bleibt true
- React-State direkte Mutation
- 429 Rate-Limit zeigt "Unknown Error"
- i18n-Keys für genericOpenAi/anthropic/litellm/voyageAi
- MCP hypervisor EPERM bei chmod im Docker
- Embed Widgets: Content-Type fehlt, Datumslogik invertiert, setError auf unmounted Component
- DnDWrapper Status `"success"` → `"added_context"`
- uploadLink fehlt Content-Type Header
- Multer hotdir wird nicht erstellt
- KeyboardShortcutsHelp Dead Cleanup
- 8 hardcodierte EN-Strings → i18n
- "to disabled" Grammatikfehler → "to disable"

### 2.3 TypeScript strict mode
- `frontend/tsconfig.json` — `strict: true` aktiviert

### 2.4 Entfernte Telemetrie
- PostHog komplett entfernt
- Mintplex CDN entfernt
- Alle Analytics-Calls gelöscht

---

## 3. Was OpenAfD-Chat hat, das OpenSIN-Chat NICHT hat

### 3.1 LLM-Provider (23 mehr als OpenSIN!)

OpenAfD hat **40 LLM-Provider**, OpenSIN hat nur **17**.

**Nur in OpenAfD (23 Provider):**

| Provider | Frontend | Server | Agent |
|---|---|---|---|
| ApiPie | `ApiPieOptions/` | `AiProviders/apipie/` | `apipie.js` |
| AWS Bedrock | `AwsBedrockLLMOptions/` | `AiProviders/bedrock/` | `bedrock.js` |
| Azure OpenAI | `AzureAiOptions/` | `AiProviders/azureOpenAi/` | `azure.js` |
| Cerebras | `CerebrasLLMOptions/` | `AiProviders/cerebras/` | `cerebras.js` |
| Cohere | `CohereAiOptions/` | `AiProviders/cohere/` | `cohere.js` |
| CometAPI | `CometApiLLMOptions/` | `AiProviders/cometapi/` | `cometapi.js` |
| DeepSeek | `DeepSeekOptions/` | `AiProviders/deepseek/` | `deepseek.js` |
| Dell Pro AI Studio | `DPAISOptions/` | `AiProviders/dellProAiStudio/` | `dellProAiStudio.js` |
| Foundry | `FoundryOptions/` | `AiProviders/foundry/` | `foundry.js` |
| GiteeAI | `GiteeAIOptions/` | `AiProviders/giteeai/` | `giteeai.js` |
| KoboldCPP | `KoboldCPPOptions/` | `AiProviders/koboldCPP/` | `koboldcpp.js` |
| Lemonade | `LemonadeOptions/` | `AiProviders/lemonade/` | `lemonade.js` |
| Minimax | `MinimaxOptions/` | `AiProviders/minimax/` | `minimax.js` |
| Moonshot AI | `MoonshotAiOptions/` | `AiProviders/moonshotAi/` | `moonshotAi.js` |
| Novita | `NovitaLLMOptions/` | `AiProviders/novita/` | `novita.js` |
| OpenRouter | `OpenRouterOptions/` | `AiProviders/openrouter/` | `openrouter.js` |
| Perplexity | `PerplexityOptions/` | `AiProviders/perplexity/` | `perplexity.js` |
| PPIO | `PPIOLLMOptions/` | `AiProviders/ppio/` | — |
| PrivateMode | `PrivateModeOptions/` | — | `privatemode.js` |
| SambaNova | `SambaNovaOptions/` | `AiProviders/sambanova/` | — |
| TextGenWebUI | `TextGenWebUIOptions/` | `AiProviders/textgenwebui/` | `textgenwebui.js` |
| Together AI | `TogetherAiOptions/` | `AiProviders/togetherai/` | `togetherai.js` |
| ZAI | `ZAiLLMOptions/` | `AiProviders/zai/` | `zai.js` |

### 3.2 Embedding-Provider (5 mehr als OpenSIN)

**Nur in OpenAfD:**
- AzureAiOptions
- CohereOptions
- LemonadeOptions
- OpenRouterOptions
- (AzureAiOptions.test.jsx)

### 3.3 Telegram Bot (komplettes Feature)

- `server/endpoints/telegram.js` — Telegram-Webhook-Endpoint
- `server/utils/telegramBot/` — Bot-Logic (chat, constants, utils, media, stream, format, verification)
- `server/jobs/handle-telegram-chat.js` — Background-Job
- 10 Test-Dateien für Telegram Bot

### 3.4 Sonstige OpenAfD-eigene Dateien
- `frontend/src/components/Modals/ManageWorkspace/Documents/WorkspaceDirectory/RenderFileRows.jsx`
- `server/endpoints/utils/lemonadeUtilsEndpoints.js`
- `server/utils/helpers/azureOpenAiModelPref.js`
- `PROJECT_SUMMARY.md`
- `bom.json` (SBOM)
- Helm Chart unter `openafd-chat/` (statt `opensin-chat/`)

---

## 4. Branding-Unterschiede

### 4.1 Was unterschiedlich ist

| Element | OpenSIN-Chat | OpenAfD-Chat |
|---|---|---|
| Brand-Name | `OpenSIN` | `OpenAfD` |
| package.json name | `opensin-chat` | `openafd-chat` |
| Frontend package | `opensin-chat-frontend` | `openafd-chat-frontend` |
| Server package | `opensin-chat-server` | `openafd-chat-server` |
| Logo-Dateien | `opensin-logo.png`, `opensin-logo-dark.png` | `openafd-logo.png`, `openafd-logo-dark.png` |
| LogoContext.tsx | Importiert `opensin-logo.png` | Importiert `openafd-logo.png` |
| Docker Compose name | `opensin` | `openafd` |
| Container name | `opensin-app` | `openafd` |
| Helm Chart dir | `opensin-chat/` | `openafd-chat/` |
| check-branding.sh | `OpenSIN Chat — Branding Linter` | `OpenAfD Chat — Branding Linter` |
| Dateien mit Brand-String | 130 Dateien (OpenSIN) | 178 Dateien (OpenAfD) |
| localStorage keys | `openafd_*` (beide nutzen dieselben!) | `openafd_*` |
| AUTH_TOKEN | `"openafd_authToken"` (beide!) | `"openafd_authToken"` |

### 4.2 Was GLEICH bleibt

- **localStorage keys**: Beide nutzen `openafd_*` — das ist bewusst so beibehalten worden
- **AUTH_TOKEN Konstante**: `"openafd_authToken"` in beiden Repos identisch
- **Upstream-Credit**: Beide creditieren Mintplex Labs/AnythingLLM
- **Lizenz**: MIT in beiden

### 4.3 Branding-Linter Whitelist-Unterschiede

OpenSIN-Chat hat zusätzliche Whitelist-Einträge:
- `THIRD_PARTY.md` (zusätzlich zu `THIRD-PARTY.md`)
- `docs/changelog-recent.md`
- `docs/abandoned-packages-audit.md`
- `docker/.env.example`
- `server/.env.example`
- Helm chart values.yaml + Chart.yaml
- Dockerfile (upstream asset download)

---

## 5. Sync-Strategie

### 5.1 Was übertragen werden muss (von OpenSIN → OpenAfD)

**Gruppe A — Bug-Fixes & Verbesserungen (must-have):**
- Alle 1100+ Bug-Fixes aus Runden 1-9
- SSE-Streaming-Resilienz (Stall-Timer, 429-Handler, safeJson)
- Whitespace-Validierung
- Mobile Layout (SidebarMobileHeader)
- useChatHistory useMemo Fix
- React State Mutation Fix
- WebSocket loadingResponse Fix
- MCP Hypervisor EPERM Fix
- Theme useThemeContext Fix
- 10 Escape-Handler
- Temperature clamping
- Unsaved-Changes-Warnung
- DeleteWorkspace SPA-Navigation
- NewWorkspaceModal Fix
- fetchPfp graceful null
- Alle i18n-Fixes

**Gruppe B — Neue Features (sollten übertragen werden):**
- PDF-Analyse (komplettes Feature)
- Politiker-Sync / Abgeordnetenwatch
- Console Sidebar
- Text Size Menu
- Security Headers + CSP
- Rate Limiting
- Stop-Generation-Button
- LLM-Selector Keyboard-Shortcut
- DnDWrapper (Drag & Drop)
- E2E-Test-Framework (Playwright)
- CI/CD Webhook-Server
- Bounded Job Store
- Boot-Diagnose
- Image-URL-Extraktion
- Docs-Seite (interne Doku)
- Filesystem-Browser-Hook
- Session-Context-Injection
- TypeScript strict mode

**Gruppe C — OpenAfD-eigene Features (müssen erhalten bleiben):**
- 23 zusätzliche LLM-Provider (Frontend + Server + Agent)
- 5 zusätzliche Embedding-Provider
- Telegram Bot
- Lemonade Utils Endpoints
- Azure OpenAI Model Pref Helper

### 5.2 Branding-Regeln für den Sync

1. **Alle Code-Änderungen** aus OpenSIN übernehmen OHNE Branding-Strings
2. **Nach dem Sync**: Alle `OpenSIN`/`opensin` Strings → `OpenAfD`/`openafd` ersetzen
3. **Logo-Dateien**: OpenAfD-Logos behalten (`openafd-logo.png`, `openafd-logo-dark.png`)
4. **package.json**: `openafd-chat*` beibehalten
5. **Docker**: `openafd` Container-Name beibehalten
6. **Helm Chart**: `openafd-chat/` Verzeichnis beibehalten
7. **localStorage keys**: `openafd_*` beibehalten (bereits identisch)
8. **check-branding.sh**: OpenAfD-Version beibehalten, aber neue Whitelist-Einträge aus OpenSIN übernehmen
9. **.env.example, Dockerfile, Helm**: Branding-Linter-Whitelist um OpenAfD-spezifische Dateien erweitern

### 5.3 Empfohlene Sync-Methodik

**Option A — Cherry-Pick (riskant, aufwändig):**
- 520 Commits einzeln cherry-picken
- Hohe Konfliktwahrscheinlichkeit bei 886 modifizierten Dateien
- Sehr zeitaufwändig

**Option B — Merge mit Branding-Revert (empfohlen):**
1. In OpenAfD-Chat: `git merge opensin-ai/main --no-commit`
2. Konflikte manuell lösen (OpenAfD-eigene Provider/Telegram behalten)
3. Nach Merge: Branding-Script laufen lassen (`OpenSIN` → `OpenAfD`)
4. Logos zurücksetzen auf OpenAfD-Logos
5. package.json Namen zurücksetzen
6. Docker/Helm-Branding zurücksetzen
7. check-branding.sh anpassen
8. Build + Test + Deploy

**Option C — Rebase + manuelle Provider-Rückführung (komplex):**
1. OpenAfD-Chat auf OpenSIN-Chat main resetten
2. Alle 23 LLM-Provider + 5 Embedding-Provider + Telegram Bot manuell zurückkopieren
3. Branding anpassen
4. Sauberer Stand, aber hoher manueller Aufwand

### 5.4 Konfliktzonen (kritische Dateien)

Diese Dateien werden beim Merge Konflikte erzeugen und manuelle Lösung erfordern:

| Datei | Grund |
|---|---|
| `frontend/src/utils/constants.ts` | OpenAfD hat zusätzliche Konstanten (KOBOLDCPP_COMMON_URLS, DPAIS_COMMON_URLS) |
| `frontend/src/components/LLMSelection/` | OpenAfD hat 23 mehr Provider — Verzeichnisstruktur komplett unterschiedlich |
| `frontend/src/components/EmbeddingSelection/` | OpenAfD hat 5 mehr Provider |
| `server/utils/agents/aibitat/providers/index.js` | Provider-Registry — OpenAfD registriert 23 mehr Provider |
| `server/utils/AiProviders/` | OpenAfD hat 23 mehr Provider-Implementierungen |
| `server/utils/EmbeddingEngines/` | OpenAfD hat mehr Embedding-Engines |
| `scripts/check-branding.sh` | Unterschiedliche Whitelist |
| `frontend/src/LogoContext.tsx` | Unterschiedliche Logo-Importe |
| `docker/docker-compose.yml` | Unterschiedliches Branding + Container-Name |
| `package.json` (root, frontend, server) | Unterschiedliche Namen |
| `frontend/src/components/SettingsSidebar/index.tsx` | OpenSIN hat zusätzliche Sidebar-Einträge (PDF, Politician) |
| `server/app.js` | OpenSIN hat zusätzliche Endpoint-Mounts (pdfAnalysis, cspViolation) |
| `frontend/src/main.tsx` | OpenSIN hat zusätzliche Routes (pdf-analysis, politician-sync) |

---

## 6. Empfehlung

### Option B (Merge + Branding-Revert) ist die beste Strategie

**Begründung:**
- Erhält alle 23 OpenAfD-eigenen LLM-Provider automatisch (sie existieren in OpenAfD und werden durch Merge nicht gelöscht)
- Überträgt alle 520 Commits an Bug-Fixes und Features auf einmal
- Branding-Revert ist mechanisch (Suchen/Ersetzen + Logos)
- Konflikte sind vorhersehbar und auf ~15 Dateien begrenzt
- Telegram Bot bleibt erhalten (existiert nur in OpenAfD)

**Geschätzter Aufwand:**
- Merge + Konfliktlösung: 2-4 Stunden
- Branding-Revert: 30-60 Minuten
- Build + Test + Deploy: 30 Minuten
- Gesamt: ~4-6 Stunden

### Nach dem Merge zwingend:

1. **Branding-Script ausführen**: `sed`-basiert `OpenSIN` → `OpenAfD`, `opensin` → `openafd` (mit Ausnahmen für Upstream-Credit)
2. **Logos zurücksetzen**: OpenAfD-Logos in `frontend/src/media/logo/` wiederherstellen
3. **package.json Namen**: Zurück auf `openafd-chat*`
4. **Docker Compose**: Container-Name `openafd`, image `openafd`
5. **Helm Chart**: `openafd-chat/` Verzeichnisname
6. **check-branding.sh**: OpenAfD-Version + neue Whitelist-Einträge
7. **Frontend Build + Test**: `yarn build && yarn test`
8. **E2E Tests**: Playwright gegen Produktion (oder Staging)
9. **Deploy**: `docker cp` + restart

---

## 7. Risikoanalyse

| Risiko | Wahrscheinlichkeit | Auswirkung | Mitigation |
|---|---|---|---|
| Provider-Registry Konflikt | Hoch | LLM-Provider nicht verfügbar | Manuelle Lösung: OpenAfD-Provider beibehalten + OpenSIN-Fixes mergen |
| Branding-String falsch ersetzt | Mittel | Falsche Anzeige | check-branding.sh nach Merge laufen lassen |
| Telegram Bot kaputt | Niedrig | Feature-Verlust | Bot-Dateien sind in OpenAfD-only, Merge löscht sie nicht |
| localStorage Kompatibilität | Keine | — | Keys sind bereits identisch (`openafd_*`) |
| Database Schema Unterschied | Mittel | Migration nötig | Prisma Schema vergleichen, ggf. Migration |
| Test-Failures nach Merge | Hoch | Build blockiert | Tests fixen wie in OpenSIN bereits geschehen |

---

## 8. Fazit

OpenSIN-Chat ist 520 Commits und 1100+ Bug-Fixes weiter als OpenAfD-Chat. Die Übertragung
ist technisch machbar über einen Git-Merge mit anschließendem Branding-Revert. Die
23 zusätzlichen LLM-Provider und der Telegram Bot in OpenAfD-Chat bleiben durch den Merge
erhalten, da sie in OpenSIN-Chat nicht existieren und daher keinen Konflikt erzeugen.

Der Sync sollte zeitnah erfolgen, da die Abweichung mit jedem weiteren Commit in OpenSIN-Chat
größer wird.
