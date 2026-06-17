# OpenSIN-Chat — Changelog

All notable changes to **OpenSIN-Chat** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

### Incident — 2026-06-17 — Cloudflare Error 1033 on sinchat.delqhi.com

A fresh-out outage surfaced a structural gap: `cloudflared` had died
on the OCI VM (`sin-blackbox` / `92.5.116.158`) with no external
monitor, so the silent network break was only noticed when the user
opened the URL. This release ships the recovery, the prevention, and
the runbook so this exact failure mode cannot recur.

### Added

- `scripts/cloudflared-watchdog/`: systemd unit + bash watchdog that
  keeps the Cloudflare tunnel alive on the OCI VM (`sinchat.delqhi.com`).
  Polls every 30 s, restarts cloudflared on failure, rate-limits to
  10 restarts per 10-min window. The watchdog itself is supervised by
  systemd via `Restart=always`/`RestartSec=10`. See
  `scripts/cloudflared-watchdog/README.md` for the one-time install
  command set.
- `scripts/oci-vm-bootstrap/`: end-to-end setup for the OCI VM.
  - `bootstrap.sh` — one-shot installer (transfer systemd units from
    this repo to `sin-blackbox`, install `cloudflared-watchdog` +
    `sinchat-healthcheck`, write `/etc/opensin/healthcheck.env`,
    restart `cloudflared`, verify the public URL is reachable).
  - `emergency-recover.sh` — 5-step recovery: VM reachable →
    `cloudflared` installed → systemd unit live → tunnel creds
    present → start + external verify (`HTTP 2xx/3xx`).
  - Both auto-detect `sin-blackbox` from `~/.ssh/config` and the
    latest tunnel JSON from `~/.cloudflared/`.
- `docs/INCIDENT-RESPONSE.md`: canonical runbook for "service is
  down, what now?". Maps Cloudflare error codes (1033/521/522/523)
  to root cause to concrete shell command. Names the exact SSH host,
  IP, keys, tunnel JSON path, Infisical project ID.
- 4 new global skills under `~/.config/opencode/skills/`:
  - `skill-oci-vm-ops` (general OCI VM operations runbook)
  - `skill-cloudflared-recovery` (narrower: tunnel-only)
  - `skill-incident-response` (universal Detect → Recover → Prevent)
  - `skill-infisical-secret-handling` (5 rules + 4 good channel
    patterns; the result of THIS incident's secondary lesson that
    a pasted Infisical token is leaked by definition).

### Changed

- `AGENTS.md` (global rule, `~/.config/opencode/AGENTS.md`):
  - priority 10 — NEVER paste tokens (`Infisical`/`GitHub`/`OpenAI`/…)
    in chat history, file contents, git commits, or `ps`-visible
    env. Channel via `chmod 600` temp file + stdin, OR use sin-infisical's
    file/stdin paths. Paste IS leak; rotate BEFORE usage.
  - priority 20 — agent sandboxes (`opencode`/`sin-code`) cannot SSH
    or run cloudflared/cloud-init. For sinchat ops ALWAYS use
    `scripts/oci-vm-bootstrap/` + `docs/INCIDENT-RESPONSE.md`. Hand
    the operator a single one-shot command instead of pretending.

### Removed

(none)

### Fixed

(none — incident-class change rather than bugfix)

### Verification

- Frontend `vitest`: **196 files / 1374 tests pass**
- Server `jest`:   **94 suites / 1536 tests pass**
- Frontend `yarn build`: success (~33 s)
- Shell checker `bash -n` on both new scripts: pass

### Operator action (next 5 minutes)

```bash
bash /Users/jeremy/dev/OpenSIN-Chat/scripts/oci-vm-bootstrap/emergency-recover.sh
```

— runs the 5-step recovery on `sin-blackbox` from the operator's
laptop; exits 0 when `curl https://sinchat.delqhi.com/` returns 2xx/3xx.

Then once back:

```bash
bash /Users/jeremy/dev/OpenSIN-Chat/scripts/oci-vm-bootstrap/bootstrap.sh
```

— installs the watchdog + healthcheck so you don't have to do this
again by hand.

## [3.18.0] — 2026-06-16 — Provider prune (wave-1..wave-6)

### Removed (16+ dead LLM/embedding/STT providers)

This release strips the legacy AnythingLLM provider surface to the
**18 active providers** currently shipped in the UI:

> OpenAI, Anthropic, Gemini, NVIDIA NIM, OpenCode Zen, HuggingFace,
> Ollama, LM Studio, Docker Model Runner, LocalAI, Fireworks AI,
> Mistral, Groq, LiteLLM, xAI, Generic OpenAI, Privatemode (UI kept,
> backend re-implementation deferred), Model Router.

Providers removed across wave-1..wave-6:

| # | Provider | Original dir / module | Killed in |
|---|---|---|---|
| 1 | MySQL DB layer | `server/utils/database/` (mysql subset) | wave-1+2 |
| 2 | MSSQL DB layer | `server/utils/database/` (mssql subset) | wave-1+2 |
| 3 | Apache Arrow | server-side embeddings | wave-3 |
| 4 | `truncate()` util | frontend (10 files migrated to `@/utils/strings`) | wave-3 |
| 5 | KoboldCPP       | LLM text-gen              | wave-5 |
| 6 | Azure OpenAI LLM | LLM (Azure **embedding** kept) | wave-5 |
| 7 | Together AI      | LLM text-gen              | wave-5 |
| — | moonshotai       | LLM text-gen              | wave-6 |
| — | cometapi         | LLM text-gen              | wave-6 |
| — | lemonade         | LLM + STT + embedding     | wave-6 |
| — | **minimax**      | LLM text-gen              | wave-6 |
| — | cerebras         | LLM text-gen              | wave-6 |
| — | zai (Z.AI)       | LLM text-gen              | wave-6 |
| — | dpais            | LLM (Dell Pro AI Studio)  | wave-6 |
| — | foundry          | LLM text-gen              | wave-6 |
| — | giteeai          | LLM text-gen              | wave-6 |
| — | apipie           | LLM text-gen              | wave-6 |
| — | bedrock          | LLM (AWS)                 | wave-6 |
| — | `openrouter`     | LLM text-gen              | wave-6 |
| — | `textgenwebui`   | LLM text-gen              | wave-6 |
| — | cohere           | LLM text-gen              | wave-6 |
| — | deepseek         | LLM text-gen              | wave-6 |
| — | ppio             | LLM text-gen              | wave-6 |
| — | novita           | LLM text-gen              | wave-6 |
| — | perplexity       | LLM text-gen (search skill kept) | wave-6 |
| — | sambanova        | LLM text-gen              | wave-6 |
| — | privatemode      | DELETED backend only — UI option still present, see Unreleased | wave-6 |

### Changed

- Frontend `LLMPREFERENCE` provider registry trimmed to the 18 active
  providers in two parallel files (`providers.tsx`, `llmProviders.tsx`)
  plus onboarding flow (`OnboardingFlow/Steps/LLMPreference/index.tsx`).
- `pages/WorkspaceSettings/AgentConfig/AgentLLMSelection/index.tsx`:
  `ENABLED_PROVIDERS` mirrors the same registry.
- `pages/GeneralSettings/EmbeddingPreference/index.tsx`: only
  OpenAI/Gemini/localai/ollama/lmstudio/voyageai/litellm/mistral/
  generic-openai/native remain.
- `pages/GeneralSettings/AudioPreference/stt.tsx`: only
  native/openai/deepgram/generic-openai remain.
- `pages/GeneralSettings/AudioPreference/tts.tsx`: only
  native/openai-compatible/elevenlabs/kokoro (ElevenLabs TTS kept —
  bare ElevenLabs LLM was removed).
- `components/ProviderPrivacy/constants.js`: privacy-map trimmed.
- `hooks/useProviderModels.ts`: `GROUPED_PROVIDERS` and
  `PROVIDER_DEFAULT_MODELS` pruned.
- `aibitat/providers/ai-provider.js` (`LangChainChatModel` switch)
  switched to the active provider set.
- `aibitat/index.js` (`getProviderForConfig` switch) mirrored.
- `endpoints/utils.js` (`getModelTag` switch) mirrored.
- `helpers/updateENV.js` `supportedLLM` list + dead env-validation
  blocks (TextGenWebUI, Privatemode, Lemonade STT) removed.
- `helpers/keyModelMap.js` `KEY_MAPPING` mirrored.
- `helpers/index.js` `getLLMProvider*` switches and
  `getBaseLLMProviderModel` switched + `azure` case removed (Azure
  embedding kept).
- `helpers/customModels.js`: orphan `getPrivatemodeModels` and
  dead-comment stubs for SambaNova/Cerebras removed.
- `boot/eagerLoadContextWindows.js`: foundry/cerebras cases removed.
- `AiProviders/modelMap/legacy.js`: cohere/deepseek/minimax/cerebras/
  giteeai removed.
- `models/systemSettings.js` `llmPreferenceKeys`: 23 dead provider
  env-var aliases removed (Privatemode, TextGenWebUI, Lemonade STT,
  MoonShot, Cohere, Bedrock, Novita, Foundry, …).
- `models/systemSettings.js`: STT-Lemonade keys removed.

### Fixed

- `pages/GeneralSettings/AudioPreference/stt.tsx` now derives required
  STT fields from the same source of truth as `SUPPORT_CUSTOM_MODELS`,
  no more drift.
- `helpers/customModels.js`: dead `getPrivatemodeModels` + SambaNova/
  Cerebras comment stubs removed.
- `helpers/chat/responses.js`: comments no longer suggest Cerebras-
  specific conform behaviour on providers that are gone forever.
- Pre-existing broken frontend tests re-fixed:
  - `components/Modals/NewWorkspace.test.jsx` — wrapped in `MemoryRouter`
  - `components/Sidebar/ActiveWorkspaces/ThreadContainer/ThreadFolderItem.test.jsx`
    — added `assignThread` mock + `waitFor(invalidateThreads)`

### Removed (files)

**Backend (server/)**
- `utils/AiProviders/textGenWebUI/index.js`
- `utils/AiProviders/lemonade/` (entire directory)
- `utils/SpeechToText/lemonade/index.js`
- `utils/SpeechToText/lemonade/`
- `utils/EmbeddingEngines/openRouter/index.js`
- `utils/agents/aibitat/providers/textgenwebui.js`
- `endpoints/utils/lemonadeUtilsEndpoints.js`
- `__tests__/utils/helpers/azureOpenAiModelPref.test.js`
  (Azure LLM provider was already removed in wave-5)

**Frontend (frontend/src/)**
- `components/LLMSelection/ApiPieOptions/`
- `components/LLMSelection/AwsBedrockLLMOptions/`
- `components/LLMSelection/CerebrasLLMOptions/`
- `components/LLMSelection/CohereAiOptions/`
- `components/LLMSelection/CometApiLLMOptions/`
- `components/LLMSelection/DPAISOptions/`
- `components/LLMSelection/DeepSeekOptions/`
- `components/LLMSelection/FoundryOptions/`
- `components/LLMSelection/GiteeAIOptions/`
- `components/LLMSelection/LemonadeOptions/`
- `components/LLMSelection/MinimaxOptions/`
- `components/LLMSelection/MoonshotAiOptions/`
- `components/LLMSelection/NovitaLLMOptions/`
- `components/LLMSelection/OpenRouterOptions/`
- `components/LLMSelection/PPIOLLMOptions/`
- `components/LLMSelection/PerplexityOptions/`
- `components/LLMSelection/PrivateModeOptions/`
- `components/LLMSelection/SambaNovaOptions/`
- `components/LLMSelection/TextGenWebUIOptions/`
- `components/LLMSelection/ZAiLLMOptions/`
- `components/EmbeddingSelection/CohereOptions/`
- `components/EmbeddingSelection/LemonadeOptions/`
- `components/EmbeddingSelection/OpenRouterOptions/`
- `components/SpeechToText/LemonadeOptions/`
- `media/llmprovider/`: 21 dead provider logos
- `models/utils/lemonadeUtils.ts`
- 20 dead translation blocks per locale file
  (`locales/en/common.js` −198 lines, `locales/de/common.js` −202 lines)

### Verification

- Frontend `vitest`: **196 files / 1374 tests pass**
- Server `jest`:   **94 suites / 1536 tests pass**
- Frontend `yarn build`: success (~33 s)
- Lint warnings/errors unchanged from baseline on unrelated files.

## [3.x.y] — earlier

See git history. This CHANGELOG focuses on the 2026-06 wave prune.

[3.18.0]: https://github.com/OpenSIN-AI/OpenSIN-Chat/compare/<prev>...eea11c94
[Unreleased]: https://github.com/OpenSIN-AI/OpenSIN-Chat/compare/3.18.0...HEAD
