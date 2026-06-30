// SPDX-License-Identifier: MIT
import { useEffect, useRef } from "react";
import { v4 } from "uuid";
import { ABORT_STREAM_EVENT } from "@/utils/chat";
import {
  websocketURI,
  AGENT_SESSION_END,
  AGENT_SESSION_START,
} from "@/utils/chat/agent";
import SSESocket from "@/utils/chat/SSESocket";
import { CLEAR_ATTACHMENTS_EVENT } from "@/components/WorkspaceChat/ChatContainer/DnDWrapper";
import { AUTH_TOKEN } from "@/utils/constants";
import { safeGetItem } from "@/utils/safeStorage";

/**
 * Build the WebSocket URL for an agent invocation, including the user's
 * auth token as a query parameter so the backend can validate the upgrade.
 * Browser WebSocket clients cannot send custom headers, so the token is the
 * only way to authenticate the WebSocket connection.
 */
function agentWebsocketUrl(socketId: string | null) {
  if (!socketId) return null;
  const base = `${websocketURI()}/api/agent-invocation/${socketId}`;
  const token = safeGetItem(AUTH_TOKEN);
  if (!token) return base;
  const url = new URL(base);
  url.searchParams.set("token", token);
  return url.toString();
}

// ── Reconnection parameters ─────────────────────────────────────────────────
const MAX_RECONNECT_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 10_000;

// ── Heartbeat parameters ────────────────────────────────────────────────────
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = HEARTBEAT_INTERVAL_MS * 2;

const WS_FALLBACK_TIMEOUT_MS = 3_000;

/**
 * Custom hook to manage WebSocket connection for agent invocation.
 * Encapsulates socket lifecycle, event listeners, and cleanup.
 *
 * @param {Object} params
 * @param {string|null} params.socketId - The socket ID to connect to.
 * @param {WebSocket|null} params.websocket - The current WebSocket instance (to prevent duplicate connections).
 * @param {Function} params.setWebsocket - Setter for the websocket state.
 * @param {Function} params.setSocketId - Setter for the socket ID state.
 * @param {Function} params.setAgentSessionActive - Setter for agent session active state.
 * @param {Function} params.setLoadingResponse - Setter for loading response state.
 * @param {Function} params.handleSocketResponse - Handler for incoming socket messages.
 * @param {Function} params.setChatHistory - Setter for chat history state.
 * @param {React.MutableRefObject} params.pendingResetRef - Ref tracking pending reset during agent session.
 */
export default function useWebSocket({
  socketId,
  websocket,
  setWebsocket,
  setSocketId,
  setAgentSessionActive,
  setLoadingResponse,
  handleSocketResponse,
  setChatHistory,
  pendingResetRef,
  workspaceSlug = null,
  threadSlug = null,
}) {
  // Track whether the close was intentional (user abort, /reset, etc.)
  // so we don't attempt reconnection on intentional disconnects.
  const intentionalCloseRef = useRef(false);
  // Track reconnection attempt count for exponential backoff.
  const reconnectAttemptsRef = useRef(0);
  const useSSEFallbackRef = useRef(false);

  useEffect(() => {
    let socket = null;
    let heartbeatInterval = null;
    let heartbeatTimeout = null;
    let reconnectTimer = null;
    let isMounted = true;

    function clearTimers() {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (heartbeatTimeout) {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }

    function handleAbortStream(event: any) {
      const detail = event && event.detail;
      if (detail) {
        if (detail.socketId && detail.socketId !== socketId) {
          return;
        }
        if (
          workspaceSlug &&
          detail.workspaceSlug &&
          detail.workspaceSlug !== workspaceSlug
        ) {
          return;
        }
        if (
          threadSlug &&
          detail.threadSlug &&
          detail.threadSlug !== threadSlug
        ) {
          return;
        }
        if (
          !detail.socketId &&
          workspaceSlug &&
          !detail.workspaceSlug &&
          !detail.threadSlug
        ) {
          return;
        }
      }
      intentionalCloseRef.current = true;
      setAgentSessionActive(false);
      window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
      socket?.close();
    }

    function startHeartbeat(ws) {
      heartbeatInterval = setInterval(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        // Clear previous pong timeout; if pong doesn't arrive in time,
        // the connection is stale and we force-close it.
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = setTimeout(() => {
          console.warn(
            "[useWebSocket] Heartbeat timeout — connection appears stale.",
          );
          // Mark as unintentional so we attempt reconnection
          intentionalCloseRef.current = false;
          ws.close();
        }, HEARTBEAT_TIMEOUT_MS);

        // Send a ping; the browser WebSocket API doesn't expose ping/pong
        // directly, so we use an application-level heartbeat message.
        // The server's relayToSocket will safely ignore unknown messages.
        try {
          ws.send(JSON.stringify({ type: "__heartbeat" }));
        } catch {
          // Socket already gone — let the close handler deal with it.
        }
      }, HEARTBEAT_INTERVAL_MS);
    }

    function attachListeners(ws) {
      // Reset the pong-timeout whenever any message arrives (including pong).
      ws.addEventListener("message", (event) => {
        // Any incoming message means the connection is alive.
        clearTimeout(heartbeatTimeout);

        try {
          handleSocketResponse(ws, event, setChatHistory);
        } catch {
          console.error("Failed to parse data");
          intentionalCloseRef.current = true;
          setAgentSessionActive(false);
          window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
          ws.close();
        }
        // NOTE: setLoadingResponse(false) is NOT called here.
        // It is only called when the WebSocket closes (see 'close' handler
        // below) or when handleSocketResponse dispatches AGENT_SESSION_END.
        // Calling it on every message caused a premature SWR refetch that
        // overwrote local state with server data missing the current turn.
      });

      ws.addEventListener("close", (event) => {
        clearTimers();

        // If the server closed with 1008 (Policy Violation), the session
        // is permanently ended (e.g. invocation already closed). Don't
        // attempt reconnection — it can never succeed.
        if (event?.code === 1008) {
          intentionalCloseRef.current = true;
        }

        // Attempt reconnection if the close was unintentional and we
        // haven't exhausted our retry budget.
        if (
          !intentionalCloseRef.current &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS &&
          isMounted
        ) {
          const attempt = reconnectAttemptsRef.current;
          reconnectAttemptsRef.current++;
          const backoff = Math.min(
            INITIAL_BACKOFF_MS * Math.pow(2, attempt),
            MAX_BACKOFF_MS,
          );
          console.warn(
            `[useWebSocket] Connection lost — attempting reconnect ${attempt + 1}/${MAX_RECONNECT_ATTEMPTS} in ${backoff}ms`,
          );

          setChatHistory((prev) => [
            ...(prev as any).filter((msg) => !!msg.content),
            {
              uuid: v4(),
              type: "statusResponse",
              content: `Connection lost. Reconnecting (${attempt + 1}/${MAX_RECONNECT_ATTEMPTS})…`,
              role: "assistant",
              sources: [],
              closed: true,
              error: null,
              animate: false,
              pending: false,
            },
          ]);

          reconnectTimer = setTimeout(() => {
            if (!isMounted) return;
            if (useSSEFallbackRef.current) {
              const sseSocket = new SSESocket(socketId!);
              (sseSocket as any).supportsAgentStreaming = false;
              socket = sseSocket as any;
              setWebsocket(sseSocket as any);
              attachListeners(sseSocket as any);
            } else {
              socket = new WebSocket(agentWebsocketUrl(socketId)!);
              (socket as any).supportsAgentStreaming = false;
              setWebsocket(socket);
              attachListeners(socket);
              startHeartbeat(socket);
            }
          }, backoff);
          return;
        }

        // Either intentional close or reconnection exhausted.
        setAgentSessionActive(false);
        window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));

        // When the close was triggered by /reset, skip the "Agent session
        // complete." status - the pending /reset flow will clear history.
        if (pendingResetRef.current) {
          pendingResetRef.current = false;
        } else if (
          intentionalCloseRef.current ||
          reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS
        ) {
          const isReconnectFailure =
            reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS &&
            !intentionalCloseRef.current;
          setChatHistory((prev) => [
            ...(prev as any).filter((msg) => !!msg.content),
            {
              uuid: v4(),
              type: "statusResponse",
              content: isReconnectFailure
                ? "Agent session lost — connection could not be restored."
                : "Agent session complete.",
              role: "assistant",
              sources: [],
              closed: true,
              error: isReconnectFailure
                ? "Connection lost after multiple retry attempts."
                : null,
              animate: false,
              pending: false,
            },
          ]);
        }
        setLoadingResponse(false);
        setWebsocket(null);
        setSocketId(null);
        // Reset reconnection state for the next session.
        reconnectAttemptsRef.current = 0;
      });

      ws.addEventListener("error", () => {
        // Don't set agentSessionActive false here — let the close handler
        // deal with reconnection logic. The error event is always followed
        // by a close event.
        console.error("[useWebSocket] Socket error event received.");
      });

      ws.addEventListener("open", () => {
        // Reset reconnection counter on successful (re)connection.
        reconnectAttemptsRef.current = 0;
      });
    }

    function handleWSS() {
      try {
        if (!socketId || !!websocket) return;

        intentionalCloseRef.current = false;
        reconnectAttemptsRef.current = 0;

        window.addEventListener(ABORT_STREAM_EVENT, handleAbortStream);
        setAgentSessionActive(true);
        window.dispatchEvent(new CustomEvent(AGENT_SESSION_START));
        window.dispatchEvent(new CustomEvent(CLEAR_ATTACHMENTS_EVENT));

        // Cloudflare Tunnel deployments cannot proxy WebSocket upgrades.
        // Always use SSE fallback for agent connections.
        useSSEFallbackRef.current = true;

        const sseSocket = new SSESocket(socketId);
        (sseSocket as any).supportsAgentStreaming = false;
        socket = sseSocket as any;
        setWebsocket(sseSocket as any);
        attachListeners(sseSocket as any);
      } catch (e) {
        setChatHistory((prev) => [
          ...(prev as any).filter((msg) => !!msg.content),
          {
            uuid: v4(),
            type: "abort",
            content: e.message,
            role: "assistant",
            sources: [],
            closed: true,
            error: e.message,
            animate: false,
            pending: false,
          },
        ]);
        setLoadingResponse(false);
        setWebsocket(null);
        setSocketId(null);
      }
    }
    handleWSS();

    return () => {
      isMounted = false;
      clearTimers();
      window.removeEventListener(ABORT_STREAM_EVENT, handleAbortStream);
      if (socket) {
        intentionalCloseRef.current = true;
        setAgentSessionActive(false);
        window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
        socket.close();
      }
    };
  }, [socketId]);
}
