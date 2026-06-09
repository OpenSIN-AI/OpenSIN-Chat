// SPDX-License-Identifier: MIT
import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useSpeechRecognition } from "react-speech-recognition";
import { useTranslation } from "react-i18next";
import Workspace from "@/models/workspace";
import handleChat from "@/utils/chat";
import handleSocketResponse, {
  setAgentSessionActive,
} from "@/utils/chat/agent";
import { DndUploaderContext, CLEAR_ATTACHMENTS_EVENT } from "./DnDWrapper";
import { PROMPT_INPUT_EVENT, PROMPT_INPUT_ID } from "./PromptInput";
import { PENDING_HOME_MESSAGE } from "@/utils/constants";
import { clearPromptInputDraft } from "@/hooks/usePromptInputStorage";
import { safeJsonParse } from "@/utils/request";
import useWebSocket from "@/hooks/useWebSocket";
import paths from "@/utils/paths";
import SpeechRecognition from "react-speech-recognition";
import { invalidateChatHistory } from "@/hooks/useChatHistory";
import { invalidateThreads } from "@/hooks/useThreads";

/**
 * Encapsulates all WebSocket, chat streaming, and message-sending logic
 * for the ChatContainer.
 */
export default function useChatStream({
  workspace,
  threadSlug = null,
  knownHistory = [],
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [chatHistory, setChatHistory] = useState(knownHistory);
  const [socketId, setSocketId] = useState(null);
  const [websocket, setWebsocket] = useState(null);
  const { files, parseAttachments } = useContext(DndUploaderContext);
  const pendingMessageChecked = useRef(false);
  const pendingResetRef = useRef(false);
  const activeThreadSlug = threadSlug;
  const prevLoadingResponse = useRef(loadingResponse);

  const isEmpty =
    chatHistory.length === 0 && !sessionStorage.getItem(PENDING_HOME_MESSAGE);

  const { listening, resetTranscript } = useSpeechRecognition({
    clearTranscriptOnListen: true,
  });

  /**
   * Sync server-fetched history into local state when not streaming.
   * This keeps local state in sync with SWR revalidations after mutations.
   */
  useEffect(() => {
    if (!loadingResponse) {
      setChatHistory(knownHistory);
    }
  }, [knownHistory, loadingResponse]);

  /**
   * Invalidate the SWR chat history cache after streaming completes.
   * This ensures subsequent navigations or revalidations fetch fresh data.
   */
  useEffect(() => {
    if (prevLoadingResponse.current === true && loadingResponse === false) {
      invalidateChatHistory(workspace?.slug, activeThreadSlug);
    }
    prevLoadingResponse.current = loadingResponse;
  }, [loadingResponse, workspace?.slug, activeThreadSlug]);

  /**
   * Keep chat history bottom-padding in sync with the prompt input's
   * actual rendered height so expanding input never covers messages.
   */
  useEffect(() => {
    if (isEmpty) return;
    const wrapper = document.getElementById("prompt-input-wrapper");
    const chatEl = document.getElementById("chat-history");
    if (!wrapper || !chatEl) return;

    const observer = new ResizeObserver(([entry]) => {
      const inputHeight =
        entry.borderBoxSize?.[0]?.blockSize ?? entry.target.offsetHeight;
      chatEl.style.paddingBottom = `${inputHeight}px`;
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [isEmpty]);

  /**
   * Emit an update to the state of the prompt input without directly
   * passing a prop in so that it does not re-render constantly.
   * @param {string} messageContent - The message content to set
   * @param {'replace' | 'append'} writeMode - Replace current text or append to existing text (default: replace)
   */
  function setMessageEmit(messageContent = "", writeMode = "replace") {
    window.dispatchEvent(
      new CustomEvent(PROMPT_INPUT_EVENT, {
        detail: { messageContent, writeMode },
      }),
    );
  }

  function endSTTSession() {
    SpeechRecognition.stopListening();
    resetTranscript();
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const currentMessage =
      document.getElementById(PROMPT_INPUT_ID)?.value || "";
    if (!currentMessage) return false;

    clearPromptInputDraft(activeThreadSlug ?? workspace.slug);

    if (!activeThreadSlug && chatHistory.length === 0) {
      const { thread } = await Workspace.threads.new(workspace.slug);
      if (thread) {
        sessionStorage.setItem(
          PENDING_HOME_MESSAGE,
          JSON.stringify({
            message: currentMessage,
            attachments: parseAttachments(),
          }),
        );
        navigate(paths.workspace.thread(workspace.slug, thread.slug));
        invalidateThreads(workspace.slug);
        return;
      }
    }

    const prevChatHistory = [
      ...chatHistory,
      {
        content: currentMessage,
        role: "user",
        attachments: parseAttachments(),
      },
      {
        content: "",
        role: "assistant",
        pending: true,
        userMessage: currentMessage,
        animate: true,
      },
    ];

    if (listening) {
      endSTTSession();
    }
    setChatHistory(prevChatHistory);
    setMessageEmit("");
    setLoadingResponse(true);
  };

  const regenerateAssistantMessage = (chatId) => {
    const filteredHistory = chatHistory.slice(0, -1);
    const lastUserMessage = filteredHistory.findLast(
      (msg) => msg.role === "user",
    );
    Workspace.deleteChats(workspace.slug, [chatId])
      .then(() =>
        sendCommand({
          text: lastUserMessage.content,
          autoSubmit: true,
          history: filteredHistory,
          attachments: lastUserMessage?.attachments,
        }),
      )
      .catch((e) => console.error(e));
  };

  /**
   * Send a command to the LLM prompt input.
   * @param {Object} options - Arguments to send to the LLM
   * @param {string} options.text - The text to send to the LLM
   * @param {boolean} options.autoSubmit - Determines if the text should be sent immediately or if it should be added to the message state (default: false)
   * @param {Object[]} options.history - The history of the chat prior to this message for overriding the current chat history
   * @param {Object[]} options.attachments - The attachments to send to the LLM for this message
   * @param {'replace' | 'append' | 'prepend'} options.writeMode - Replace current text or append to existing text (default: replace)
   * @returns {void}
   */
  const sendCommand = async ({
    text = "",
    autoSubmit = false,
    history = [],
    attachments = [],
    writeMode = "replace",
  } = {}) => {
    if (!autoSubmit) {
      setMessageEmit(text, writeMode);
      return;
    }

    if (writeMode === "prepend") {
      const currentText = document.getElementById(PROMPT_INPUT_ID)?.value ?? "";
      text = currentText + " " + text;
    }

    if (writeMode === "append") {
      const currentText = document.getElementById(PROMPT_INPUT_ID)?.value ?? "";
      text = currentText + text;
    }

    if (!text || text === "") return false;

    if (!activeThreadSlug && chatHistory.length === 0 && history.length === 0) {
      const { thread } = await Workspace.threads.new(workspace.slug);
      if (thread) {
        sessionStorage.setItem(
          PENDING_HOME_MESSAGE,
          JSON.stringify({ message: text, attachments }),
        );
        navigate(paths.workspace.thread(workspace.slug, thread.slug));
        invalidateThreads(workspace.slug);
        return;
      }
    }

    clearPromptInputDraft(activeThreadSlug ?? workspace.slug);

    let prevChatHistory;
    if (history.length > 0) {
      prevChatHistory = [
        ...history,
        {
          content: "",
          role: "assistant",
          pending: true,
          userMessage: text,
          attachments,
          animate: true,
        },
      ];
    } else {
      prevChatHistory = [
        ...chatHistory,
        {
          content: text,
          role: "user",
          attachments,
        },
        {
          content: "",
          role: "assistant",
          pending: true,
          userMessage: text,
          attachments,
          animate: true,
        },
      ];
    }

    setChatHistory(prevChatHistory);
    setMessageEmit("");
    setLoadingResponse(true);
  };

  useEffect(() => {
    if (pendingMessageChecked.current || !workspace?.slug) return;
    pendingMessageChecked.current = true;

    const pending = safeJsonParse(sessionStorage.getItem(PENDING_HOME_MESSAGE));
    if (pending?.message) {
      const timer = setTimeout(() => {
        sessionStorage.removeItem(PENDING_HOME_MESSAGE);
        sendCommand({
          text: pending.message,
          attachments: pending.attachments || [],
          autoSubmit: true,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [workspace?.slug]);

  useEffect(() => {
    async function fetchReply() {
      const promptMessage =
        chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
      const remHistory = chatHistory.length > 0 ? chatHistory.slice(0, -1) : [];
      var _chatHistory = [...remHistory];

      if (!!websocket) {
        if (!promptMessage || !promptMessage?.userMessage) return false;
        const attachments = promptMessage?.attachments ?? parseAttachments();
        window.dispatchEvent(new CustomEvent(CLEAR_ATTACHMENTS_EVENT));
        websocket.send(
          JSON.stringify({
            type: "awaitingFeedback",
            feedback: promptMessage?.userMessage,
            attachments,
          }),
        );

        if (promptMessage.userMessage.trim() !== "/reset") return;
        pendingResetRef.current = true;
      }

      if (!promptMessage || !promptMessage?.userMessage) return false;

      const attachments = promptMessage?.attachments ?? parseAttachments();
      window.dispatchEvent(new CustomEvent(CLEAR_ATTACHMENTS_EVENT));

      await Workspace.multiplexStream({
        workspaceSlug: workspace.slug,
        threadSlug: activeThreadSlug,
        prompt: promptMessage.userMessage,
        chatHandler: (chatResult) =>
          handleChat(
            chatResult,
            setLoadingResponse,
            setChatHistory,
            remHistory,
            _chatHistory,
            setSocketId,
          ),
        attachments,
      });
      return;
    }
    loadingResponse === true && fetchReply();
  }, [loadingResponse, chatHistory, workspace]);

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
  });

  return {
    t,
    loadingResponse,
    chatHistory,
    setChatHistory,
    socketId,
    websocket,
    files,
    parseAttachments,
    pendingMessageChecked,
    pendingResetRef,
    activeThreadSlug,
    isEmpty,
    listening,
    resetTranscript,
    setMessageEmit,
    handleSubmit,
    sendCommand,
    regenerateAssistantMessage,
    endSTTSession,
  };
}
