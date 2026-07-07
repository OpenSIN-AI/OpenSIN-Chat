# server/utils/helpers/index.js

Provider-resolution and generic utility helpers for the OpenSIN-Chat server.

## What this file does

- Exports the canonical `getLLMProvider()` and `getVectorDbClass()` factories.
- Resolves the active LLM connector for a workspace via `resolveProviderConnector()`,
  transparently handling both direct providers and the `opensin-router` model router.
- Provides token/chunk/file-size helpers used across the server.

## Important recent change

`resolveProviderConnector()` now throws a clear, user-facing error when neither the
workspace nor the server environment has an LLM provider configured. The calling
chat stream (`server/utils/chats/stream.js`) catches this and emits an SSE abort
chunk with a meaningful message instead of the generic "Internal error" response.
This prevents the confusing `ENV: No valid LLM_PROVIDER value found in environment!`
crash path that previously surfaced as a 500 in development.

## Exports

| Helper | Purpose |
|--------|---------|
| `getLLMProvider({ provider, model })` | Returns a concrete LLM provider instance. |
| `getLLMProviderClass({ provider })` | Returns the provider class for static methods. |
| `getVectorDbClass(getExactly)` | Returns the configured vector database provider. |
| `resolveProviderConnector({ workspace, prompt, user, thread, ... })` | Returns `{ connector, routingMetadata, prefetchedContext }`. |
| `getProviderModelPreference(provider)` | Returns the provider model preference from DB or ENV. |
| `getEmbeddingEngineSelection()` | Returns the configured embedding engine. |

## Important config values

- `process.env.LLM_PROVIDER` — system-wide default LLM provider.
- `workspace.chatProvider` / `workspace.chatModel` — per-workspace overrides.
- `process.env.MODEL_ROUTER_ID` — default model router when `chatProvider` is `opensin-router`.

## Files that depend on this

- `server/utils/chats/stream.js` — resolves the chat LLM connector.
- `server/utils/agents/index.js` — resolves the agent LLM connector and model router.
- `server/utils/agents/ephemeral.js` — resolves router providers for ephemeral agents.
- Most AI provider modules under `server/utils/AiProviders/`.

## Usage example

```js
const { resolveProviderConnector } = require("../utils/helpers");
const { connector, routingMetadata, prefetchedContext } =
  await resolveProviderConnector({ workspace, message: prompt, user, thread });
```

## Known caveats

- `resolveProviderConnector()` only validates that *some* provider is configured;
  it does not verify that the provider's API key or base URL is set. Missing keys
  are still reported by the individual provider during the actual LLM call.
- The model router path requires a valid `router_id` on the workspace or a
  `MODEL_ROUTER_ID` environment variable; otherwise it throws a clear error.
