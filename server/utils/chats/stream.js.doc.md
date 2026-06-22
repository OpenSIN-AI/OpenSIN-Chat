# server/utils/chats/stream.js

## Purpose

Core streaming chat logic for OpenSIN-Chat. Orchestrates prompt preprocessing,
LLM connector resolution, vector search, context assembly, streaming or
non-streaming LLM calls, and chat persistence. It is called from the REST chat
endpoints and from the agent WebSocket flow.

Docs: `server/endpoints/chat.js`, `server/utils/helpers/index.js`,
`server/utils/chats/index.js`, `server/utils/chats/agents.js`.

## What this file does

- Preprocesses the user message (commands, URL extraction from image attachments).
- Detects agent-mode chats via `grepAgents()` and exits early when agent mode
  takes over.
- Resolves the LLM connector through `resolveLLMConnector()`, which wraps
  `resolveProviderConnector()` and converts thrown errors into user-facing SSE
  abort chunks.
- Performs vector similarity search (when applicable) and assembles pinned docs,
  parsed files, and chat history into the context window.
- Compresses messages and either streams or fetches the LLM response.
- Persists the chat record and enqueues async thread-title generation for
  default-named threads.
- Emits final SSE chunks and closes the response gracefully.

## Important recent changes

`resolveLLMConnector()` was introduced as a thin wrapper around
`resolveProviderConnector()`. It catches provider-resolution errors (e.g. the
new `"No LLM provider is configured..."` throw) and returns them as the
`error` field instead of letting them propagate to the endpoint's generic
`"Internal error"` catch block.

The streaming branch also guards against connectors that return `null` when
the provider request fails (e.g. NVIDIA NIM returning a 401 because the API
key is invalid). It emits an SSE `abort` chunk with a clear, actionable
error message instead of letting the downstream `handleStream()` and
`stream.metrics` accesses throw `Cannot read properties of null`. These
two paths together resolve issue #262 for regular REST chat messages.

## Exports

| Function / constant | Purpose |
|---------------------|----------|
| `streamChatWithWorkspace(response, workspace, message, chatMode, user, thread, attachments, abortController)` | Full chat streaming pipeline. |
| `VALID_CHAT_MODE` | Allowed chat modes: `["automatic", "chat", "query"]`. |

## Important config values

- `workspace.chatMode` — selects `automatic`, `chat`, or `query` behavior.
- `workspace.openAiHistory` — number of historical messages to include.
- `workspace.topN` / `workspace.similarityThreshold` — vector search knobs.
- `workspace.queryRefusalResponse` — custom message when query mode has no
  matching context.

## Files that depend on this

- `server/endpoints/chat.js` — calls `streamChatWithWorkspace()` for REST chat.
- `server/utils/agents/index.js` — may delegate agent chats through this flow.

## Usage

```js
const { streamChatWithWorkspace } = require("./utils/chats/stream");
await streamChatWithWorkspace(
  response,
  workspace,
  message,
  workspace?.chatMode,
  user,
  thread,
  attachments,
  abortController,
);
```

## Caveats

- The streaming branch guards against a `null`/`undefined` stream returned by a
  connector, but it does not wrap `handleStream()` in a try/catch. Other
  unexpected failures (e.g. network issues mid-stream) still propagate to the
  caller, which should return a generic client-safe error.
- The `resolveLLMConnector()` wrapper intentionally swallows *only* provider
  resolution errors. Connector misconfiguration (missing API key, invalid base
  URL) is reported by the individual provider during the LLM call; a `null`
  stream now surfaces a clear SSE `abort` message instead of the generic
  "Internal error".
