# server/endpoints/agentWebsocket.js

## Purpose

WebSocket endpoint for the OpenSIN-Chat agent-mode chat flow. Registers the
`/api/agent-invocation/:socketId` route, authenticates the connection, wires the
Socket.IO-style WebSocket to the `AgentHandler` cluster, and relays messages
between the agent runtime and the frontend.

Docs: `server/utils/agents/index.js`, `frontend/src/hooks/useWebSocket.ts`,
`server/app.js` (WebSocket setup).

## What this file does

- Registers the agent WebSocket route via `express-ws` (`app.ws(...)`).
- Authenticates every upgrade using the JWT token supplied in the `?token=` query
  parameter because browser WebSocket APIs cannot set custom headers such as
  `Authorization`.
- Enforces per-process connection limits, maximum message size, and heartbeat
  keep-alive for long-running agent conversations.
- Validates the `Origin` header to mitigate Cross-Site WebSocket Hijacking (CSWSH).
- Spawns an `AgentHandler` for the workspace, starts the `AIbitat` cluster, and
  relays agent messages to the connected frontend socket.
- On unhandled errors, sends a `wssFailure` message to the frontend and closes
  the socket.

## Important recent change

The generic `wssFailure` content of `"Internal error"` has been replaced with a
helpful setup message when the error indicates a missing or misconfigured provider
or API key (`"Agent setup failed: please check the workspace provider and API key
configuration."`). The heuristic matches both the legacy `"No valid provider"`
message and the newer `"No LLM provider is configured..."` error thrown by
`resolveProviderConnector()`. The original exception and a unique error id are still
logged server-side so operators can diagnose the real problem without leaking
secrets to connected clients.

## Exports

| Function | Purpose |
|----------|---------|
| `agentWebsocket(app, routePrefix = "")` | Registers the route and returns nothing. |
| `isAuthorizedRequest(request)` | Validates the token in `?token=` and returns the decoded payload if valid. |
| `isOriginAllowed(request)` | Checks the `Origin` header against `process.env.ALLOWED_ORIGINS` / system settings. |
| `relayToSocket(message)` | Sends a JSON payload to the connected socket. |
| `withWsLock(fn)` | Serializes WebSocket lifecycle operations to avoid races. |

## Important config values

- `AGENT_WS_MAX_CONNECTIONS` — per-process connection cap (default 50).
- `AGENT_WS_MAX_MESSAGE_BYTES` — max inbound frame size (default 1 MiB).
- `AGENT_WS_HEARTBEAT_MS` — heartbeat interval (default 30 s).
- `ALLOWED_ORIGINS` — comma-separated list of allowed origins for CSWSH checks.

## Files that depend on this

- `server/app.js` — mounts `agentWebsocket(app, "/api")` when building the Express app.
- `frontend/src/hooks/useWebSocket.ts` — opens the client-side connection to this route.
- `server/utils/agents/index.js` — `AgentHandler` runtime used inside the WebSocket.

## Usage

```js
const { agentWebsocket } = require("./endpoints/agentWebsocket");
const { buildApp } = require("./app");
const app = buildApp();
agentWebsocket(app, "/api"); // must be called after express-ws is initialized
```

## Caveats

- The WebSocket connection must include a valid token in `?token=`; header-based
  auth is not supported by the browser WebSocket API.
- `express-ws` must be initialized before this route is registered; otherwise the
  `.ws` method is undefined and the route is silently skipped.
- Test mode intentionally skips `express-ws` registration, so the WebSocket route
  is not available during automated tests.
