# server/endpoints/chat.js

## Purpose

Server-side REST chat endpoints for the OpenSIN-Chat streaming chat flow.
Exposes two SSE routes — workspace-level and thread-level chat — that validate
input, enforce rate limits, and delegate the actual streaming work to
`server/utils/chats/stream.js`.

Docs: `server/utils/chats/stream.js`, `server/utils/helpers/index.js`,
`server/utils/helpers/chat/responses.js`, `server/utils/middleware/simpleRateLimit.js`.

## What this file does

- Registers `POST /workspace/:slug/stream-chat` and
  `POST /workspace/:slug/thread/:threadSlug/stream-chat`.
- Validates the request body (non-empty message, maximum length, rate limit).
- Sets SSE headers and starts a heartbeat keepalive so long prep phases do not
  time out at proxies or load balancers.
- Calls `streamChatWithWorkspace()` to produce the actual response.
- Handles `WorkspaceThread.autoRenameThread()` for default-named threads.
- Sends telemetry/event-log records after a successful chat.
- Wraps unexpected errors in a generic SSE abort chunk and ends the response.

## Important recent change

The endpoint no longer returns the generic `"Internal error"` for the
*missing LLM provider* scenario. `resolveProviderConnector()` now throws a clear
setup error which is caught by `resolveLLMConnector()` in
`server/utils/chats/stream.js` and emitted as a user-facing SSE abort chunk
*before* the endpoint's generic catch block is reached. The `"Internal error"`
response remains only as a last-resort fallback for truly unexpected failures.

## Exports

| Function | Purpose |
|----------|---------|
| `chatEndpoints(app)` | Registers the two chat SSE routes on the supplied Express app. |
| `startSSEHeartbeat(response)` | Returns a heartbeat interval that writes `: heartbeat\n\n` every 15 s. |

## Important config values

- `CHAT_MESSAGE_MAX_LENGTH` — hard cap on a single chat message (32 000 chars).
- Rate-limit bucket `chat-stream` — 60 requests per 60 s window per endpoint.

## Files that depend on this

- `server/app.js` — mounts `chatEndpoints(apiRouter)` when building the Express app.
- `frontend/src/hooks/useChatStream.ts` and related hooks — consume the SSE stream.

## Usage

```js
const { chatEndpoints } = require("./endpoints/chat");
const app = express();
chatEndpoints(app);
```

## Caveats

- The endpoint is SSE-based; the response must be ended explicitly in every
  branch (success, validation failure, and error) to avoid hanging connections.
- The generic `"Internal error"` catch block intentionally hides implementation
  details from the client while logging the full error server-side with a
  unique id. Operational diagnostics should look at the server logs, not the
  client-visible error text.
