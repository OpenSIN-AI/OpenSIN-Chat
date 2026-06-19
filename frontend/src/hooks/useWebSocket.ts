// SPDX-License-Identifier: MIT
import { useEffect, useRef } from "react";
import { v4 } from "uuid";
import { ABORT_STREAM_EVENT } from "@/utils/chat";
import {
  websocketURI,
  AGENT_SESSION_END,
  AGENT_SESSION_START,
} from "@/utils/chat/agent";
import { CLEAR_ATTACHMENTS_EVENT } from "@/components/WorkspaceChat/ChatContainer/DnDWrapper";

// ── Reconnection parameters ─────────────────────────────────────────────────
const MAX_RECONNECT_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 10_000;

// ── Heartbeat parameters ────────────────────────────────────────────────────
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = HEARTBEAT_INTERVAL_MS * 2;

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
}) {
  // Track whether the close was intentional (user abort, /reset, etc.)
  // so we don't attempt reconnection on intentional disconnects.
  const intentionalCloseRef = useRef(false);
  // Track reconnection attempt count for exponential backoff.
  const reconnectAttemptsRef = useRef(0);

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

    function handleAbortStream() {
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

        setLoadingResponse(true);
        try {
          handleSocketResponse(ws, event, setChatHistory);
        } catch {
          console.error("Failed to parse data");
          intentionalCloseRef.current = true;
          setAgentSessionActive(false);
          window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
          ws.close();
        }
        setLoadingResponse(false);
      });

      ws.addEventListener("close", (_event) => {
        clearTimers();

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
            // Attempt reconnection by creating a new WebSocket to the same UUID.
            const newWs = new WebSocket(
              `${websocketURI()}/api/agent-invocation/${socketId}`,
            );
            newWs.supportsAgentStreaming = false;
            setWebsocket(newWs);
            attachListeners(newWs);
            startHeartbeat(newWs);
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

        // Reset state for a new session.
        intentionalCloseRef.current = false;
        reconnectAttemptsRef.current = 0;

        socket = new WebSocket(
          `${websocketURI()}/api/agent-invocation/${socketId}`,
        );
        socket.supportsAgentStreaming = false;

        window.addEventListener(ABORT_STREAM_EVENT, handleAbortStream);

        attachListeners(socket);
        startHeartbeat(socket);

        setWebsocket(socket);
        setAgentSessionActive(true);
        window.dispatchEvent(new CustomEvent(AGENT_SESSION_START));
        window.dispatchEvent(new CustomEvent(CLEAR_ATTACHMENTS_EVENT));
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
