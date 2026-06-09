// SPDX-License-Identifier: MIT
import { useEffect } from "react";
import { v4 } from "uuid";
import { ABORT_STREAM_EVENT } from "@/utils/chat";
import {
  websocketURI,
  AGENT_SESSION_END,
  AGENT_SESSION_START,
} from "@/utils/chat/agent";
import { CLEAR_ATTACHMENTS_EVENT } from "@/components/WorkspaceChat/ChatContainer/DnDWrapper";

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
  useEffect(() => {
    let socket = null;

    function handleAbortStream() {
      setAgentSessionActive(false);
      window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
      socket?.close();
    }

    function handleWSS() {
      try {
        if (!socketId || !!websocket) return;
        socket = new WebSocket(
          `${websocketURI()}/api/agent-invocation/${socketId}`,
        );
        socket.supportsAgentStreaming = false;

        window.addEventListener(ABORT_STREAM_EVENT, handleAbortStream);

        socket.addEventListener("message", (event) => {
          setLoadingResponse(true);
          try {
            handleSocketResponse(socket, event, setChatHistory);
          } catch {
            console.error("Failed to parse data");
            setAgentSessionActive(false);
            window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
            socket.close();
          }
          setLoadingResponse(false);
        });

        socket.addEventListener("close", (_event) => {
          setAgentSessionActive(false);
          window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
          // When the close was triggered by /reset, skip the "Agent session
          // complete." status - the pending /reset flow will clear history.
          if (pendingResetRef.current) {
            pendingResetRef.current = false;
          } else {
            setChatHistory((prev) => [
              ...(prev as any).filter((msg) => !!msg.content),
              {
                uuid: v4(),
                type: "statusResponse",
                content: "Agent session complete.",
                role: "assistant",
                sources: [],
                closed: true,
                error: null,
                animate: false,
                pending: false,
              },
            ]);
          }
          setLoadingResponse(false);
          setWebsocket(null);
          setSocketId(null);
        });
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
      window.removeEventListener(ABORT_STREAM_EVENT, handleAbortStream);
      if (socket) {
        setAgentSessionActive(false);
        window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
        socket.close();
      }
    };
  }, [socketId]);
}
