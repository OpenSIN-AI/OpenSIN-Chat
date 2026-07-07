# frontend/src/hooks/useWebSocket.ts

React hook that manages the WebSocket connection used for agent-mode chat
sessions.

## What this file does

- Opens a WebSocket to `/api/agent-invocation/:socketId` when the chat switches
  to agent mode.
- Sends the user's auth token as a `?token=` query parameter because browser
  WebSocket clients cannot send custom `Authorization` headers.
- Handles reconnection with exponential backoff (up to 3 attempts) and shows
  a "Connection lost. Reconnecting…" status when the socket closes
  unexpectedly.
- Emits application-level heartbeats and resets the heartbeat timeout on any
  message from the server.
- Cleans up timers, listeners, and the socket on unmount or intentional close.

## Exports

| Helper | Purpose |
|--------|---------|
| `default function useWebSocket(...)` | Manages the agent WebSocket lifecycle. |
| `agentWebsocketUrl(socketId)` | Builds the WebSocket URL, appending the stored auth token when available. |

## Important config values

- `MAX_RECONNECT_ATTEMPTS = 3` — reconnection budget after an unexpected close.
- `INITIAL_BACKOFF_MS = 1000` — base delay before the first reconnect attempt.
- `HEARTBEAT_INTERVAL_MS = 30000` — how often the client emits a `__heartbeat`.
- `HEARTBEAT_TIMEOUT_MS = 60000` — how long to wait for any server message before
  considering the connection stale.

## Files that depend on this

- `frontend/src/components/WorkspaceChat/ChatContainer/useChatStream.js` — the
  primary consumer that provides `socketId`, `setWebsocket`, and response handlers.
- `frontend/src/utils/chat/agent.ts` — provides `websocketURI()` and the response
  parser used by the hook.

## Usage example

```tsx
useWebSocket({
  socketId,
  websocket,
  setWebsocket,
  setSocketId,
  setAgentSessionActive,
  setLoadingResponse,
  handleSocketResponse,
  setChatHistory,
  pendingResetRef,
  workspaceSlug: workspace?.slug ?? null,
  threadSlug: threadSlug ?? null,
});
```

## Known caveats

- The auth token is read from `localStorage` under `opensin_authToken`. If the
  token is missing, the WebSocket connects without it; the backend will reject
  the upgrade in production, so the user must be authenticated.
- The hook uses the browser's native `WebSocket`, not Socket.IO, so there is no
  automatic polling fallback. Deployments behind proxies that block WebSocket
  upgrades must be configured to forward the upgrade.
- Reconnection only happens for unintentional closes; user aborts and `/reset`
  mark the close as intentional and skip the retry loop.
