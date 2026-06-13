# `vaneClient.js` CoDocs

`VaneClient` is the bridge between OpenSIN-Chat and the self-hosted Vane AI answer-engine sidecar, providing both raw web-search results and fully cited answers without merging Vane's codebase into this project.

## Dependency map

Files that import or depend on this client:

- `server/utils/research/webSearchEngine.js` — uses `VaneClient.search()` as the `"vane"` provider.
- `server/utils/research/index.js` — `#vaneFastPath` uses `VaneClient.answer()` to short-circuit the full research pipeline when the configured search provider is `vane`.
- `server/utils/agents/aibitat/plugins/web-browsing.js` — `_vaneEngine` uses `VaneClient.search()` for the agent's web-browsing tool.
- `server/models/systemSettings.js` — validates `agent_search_provider` and includes `"vane"` in the whitelist of allowed providers.

## Important config values & environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `VANE_API_URL` | `http://vane:3000` | Base URL of the Vane sidecar. In Docker this is the internal service DNS; externally it is `http://localhost:3101`. |
| `VANE_CHAT_PROVIDER_ID` | *(auto-discovery)* | Override the Vane chat provider ID returned by `/api/providers`. |
| `VANE_CHAT_MODEL_KEY` | *(auto-discovery)* | Override the Vane chat model key. |
| `VANE_EMBED_PROVIDER_ID` | falls back to `VANE_CHAT_PROVIDER_ID` | Override the Vane embedding provider ID. |
| `VANE_EMBED_MODEL_KEY` | falls back to `VANE_CHAT_MODEL_KEY` | Override the Vane embedding model key. |

When the overrides are set, `VaneClient.resolveModels()` uses them directly instead of querying `/api/providers`. This is useful when Vane's provider discovery is unreliable or the provider type requires manual model entries (e.g., NVIDIA NIM).

## Docker sidecar deployment

Vane is deployed as a separate container in `docker/docker-compose.yml`:

```yaml
vane:
  image: itzcrazykns1337/vane:latest
  container_name: opensin-vane
  ports:
    - "3101:3000"   # host 3101 -> container 3000
  volumes:
    - vane-data:/home/vane/data
  restart: unless-stopped
  networks:
    - opensin-chat
```

- The container runs on the same `opensin-chat` bridge network as the main `opensin-chat` app, so the app can reach it at `http://vane:3000`.
- The Vane web UI is available on the host at `http://localhost:3101` for initial setup.
- Persistent data is stored in the named Docker volume `vane-data`.

## Configuring NVIDIA NIM in Vane

Vane's **OpenAI provider** only auto-fetches the model list when the base URL is `https://api.openai.com`. For NVIDIA NIM, use the OpenAI provider as a compatibility shim but point it at the NVIDIA NIM base URL:

1. In the Vane UI, add a provider of type **OpenAI**.
2. Set the **base URL** to the NVIDIA NIM endpoint, e.g. `https://integrate.api.nvidia.com/v1`.
3. Set the **API key** to your NVIDIA NIM API key.
4. **Manually add the chat models** you want to use, because Vane will not auto-fetch them from NVIDIA's `/v1/models`. Example keys verified with a live NVIDIA NIM API key (your key may differ):
   - `meta/llama-3.1-70b-instruct` (200 OK)
   - `meta/llama-3.1-8b-instruct` (200 OK)
   
   Non-working examples from the same `/v1/models` list: `nvidia/llama-3.1-nemotron-70b-instruct`, `deepseek-ai/deepseek-r1`, `qwen/qwen2.5-7b-instruct` — these returned 404 with the tested key.
5. Use the provider ID and model key in `VANE_CHAT_PROVIDER_ID` and `VANE_CHAT_MODEL_KEY` on the OpenSIN-Chat side, or let Vane persist them in its own config.

## Known caveats / footguns

- **Stop the container before editing `config.json`.** Vane writes its config back to `config.json` on startup, so any manual edits made while the container is running will be overwritten.
- **NVIDIA API keys can appear in logs.** If you see a NVIDIA API key in Vane or OpenSIN logs, treat it as exposed and rotate it immediately.
- **Not all advertised NVIDIA models are callable with every key.** NVIDIA's `/v1/models` endpoint lists many models, but access depends on your specific API key and entitlements. Test the exact model you intend to use before relying on it in production.
- **Vane's Groq provider has a model-list parsing bug.** The Groq provider may fail to parse the available model list correctly; prefer explicit `VANE_CHAT_MODEL_KEY` / `VANE_EMBED_MODEL_KEY` overrides if you use Groq.

## Usage example

From another server file, import the client and call either `answer()` (full cited answer) or `search()` (lightweight result list):

```javascript
const { VaneClient } = require("../utils/research/vaneClient");

// Full cited answer
const answer = await VaneClient.answer("Wie hat der Bundestag zur Energiepolitik entschieden?", {
  optimizationMode: "quality", // "speed" | "balanced" | "quality"
  sources: ["web"],            // "web" | "academic" | "discussions"
});
console.log(answer.message);
console.log(answer.sources);

// Lightweight search result list
const results = await VaneClient.search("Aktuelle Umfragen Bundestagswahl");
console.log(results); // [{ title, link, snippet }, ...]
```
