// SPDX-License-Identifier: MIT
import { v4 } from "uuid";
import { safeJsonParse } from "../request";
import { API_BASE } from "../constants";
import { useEffect, useState } from "react";
import { emitAssistantMessageCompleteEvent } from "@/components/contexts/TTSProvider";
import { THREAD_RENAME_EVENT } from "@/components/Sidebar/ActiveWorkspaces/ThreadContainer";

export const AGENT_SESSION_START = "agentSessionStart";
export const AGENT_SESSION_END = "agentSessionEnd";
export const REPORT_PREVIEW_EVENT = "opensin:reportPreview";

interface ChatMessage {
  uuid: string;
  type?: string;
  content: string | null;
  role: string;
  sources?: any[];
  closed?: boolean;
  error?: string | null;
  animate?: boolean;
  pending?: boolean;
  metrics?: Record<string, any>;
  [key: string]: any;
}

type SetChatHistory = (fn: (prev: ChatMessage[]) => Partial<ChatMessage>[]) => void;

const handledEvents = [
  "statusResponse",
  "fileDownloadCard",
  "awaitingFeedback",
  "wssFailure",
  "rechartVisualize",
  "toolApprovalRequest",
  "clarificationRequest",
  "reportPreview",
  // Streaming events
  "reportStreamEvent",
];

export function websocketURI() {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  // Same-origin (relative "/api") → use the page's host + protocol so the
  // WebSocket never crosses origins (browsers reject cross-origin upgrades
  // for security and CSP would block the request anyway).
  const apiBase = import.meta.env.VITE_API_BASE || API_BASE;
  if (!apiBase || apiBase.startsWith("/")) {
    return `${wsProtocol}//${window.location.host}`;
  }
  try {
    return `${wsProtocol}//${new URL(apiBase).host}`;
  } catch {
    // Fallback if VITE_API_BASE is malformed (e.g. typo during deploy)
    return `${wsProtocol}//${window.location.host}`;
  }
}

export default function handleSocketResponse(socket: any, event: MessageEvent, setChatHistory: SetChatHistory) {
  const data: any = safeJsonParse(event.data, null);
  if (data === null) return;

  // Handle thread rename
  if (data.type === "rename_thread") {
    const { slug, name } = data.content || {};
    if (slug && name) {
      window.dispatchEvent(
        new CustomEvent(THREAD_RENAME_EVENT, {
          detail: { threadSlug: slug, newName: name },
        }),
      );
    }
    return;
  }

  // No message type is defined then this is a generic message
  // that we need to print to the user as a system response
  if (!data.hasOwnProperty("type") && !socket.supportsAgentStreaming) {
    return setChatHistory((prev) => {
      return [
        ...prev.filter((msg) => !!msg.content),
        {
          uuid: v4(),
          content: data.content,
          role: "assistant",
          sources: [],
          closed: true,
          error: null,
          animate: false,
          pending: false,
          metrics: {},
        },
      ];
    });
  }

  // toolApprovalRequest doesn't have content field, so check separately
  if (data.type === "toolApprovalRequest") {
    if (!data.requestId || !data.skillName) return;
  } else if (data.type === "clarificationRequest") {
    if (!data.requestId || !Array.isArray(data.questions)) return;
  } else if (!handledEvents.includes(data.type) || !data.content) {
    return;
  }

  if (data.type === "reportStreamEvent") {
    // Enable agent streaming for the next message so we can handle streaming or non-streaming responses
    // If we get this message we know the provider supports agentic streaming
    socket.supportsAgentStreaming = true;

    // trigger TTS auto-play
    if (data.content?.type === "chatId" && data.content?.chatId)
      emitAssistantMessageCompleteEvent(data.content.chatId);

    return setChatHistory((prev) => {
      if (data.content.type === "removeStatusResponse")
        return [
          ...prev.filter((msg) => msg.uuid !== data.content.uuid),
        ];

      if (data.content.type === "modelRouteNotification") {
        if (!data.content.routedTo) return prev;
        return [
          ...prev.filter(
            (msg) => !(msg.role === "assistant" && msg.pending && !msg.content),
          ),
          {
            uuid: data.content.uuid,
            type: "modelRouteNotification",
            content: "modelRouteNotification",
            routedTo: data.content.routedTo,
          },
        ];
      }

      const knownMessage = data.content.uuid
        ? prev.find((msg) => msg.uuid === data.content.uuid)
        : null;
      if (!knownMessage) {
        if (data.content.type === "fullTextResponse") {
          return [
            ...prev.filter((msg) => !!msg.content),
            {
              uuid: data.content.uuid,
              type: "textResponse",
              content: data.content.content,
              role: "assistant",
              sources: [],
              closed: true,
              error: null,
              animate: false,
              pending: false,
              metrics: {},
            },
          ];
        }

        // Handle textResponseChunk initialization as textResponse instead of statusResponse.
        // Without this the first chunk creates a statusResponse (thought bubble) by falling through to the default case.
        // Providers like Gemini send large chunks and can complete in a single chunk before the update logic can convert it.
        // Other providers send many small chunks so the second chunk triggers the update logic to fix the type.
        if (data.content.type === "textResponseChunk") {
          // If this first chunk is just a non-text char (like \n, \t, etc.) then we need to ignore it.
          // Some providers like LMStudio will do this and it depends on the chat template as well.
          if (!data.content.content || data.content.content.trim() === "")
            return prev;
          return [
            ...prev.filter((msg) => !!msg.content),
            {
              uuid: data.content.uuid,
              type: "textResponse",
              content: data.content.content,
              role: "assistant",
              sources: [],
              closed: true,
              error: null,
              animate: false,
              pending: false,
              metrics: {},
            },
          ];
        }

        return [
          ...prev.filter((msg) => !!msg.content),
          {
            uuid: data.content.uuid,
            type: "statusResponse",
            content: data.content.content,
            role: "assistant",
            sources: [],
            closed: true,
            error: null,
            animate: false,
            pending: false,
            metrics: {},
          },
        ];
      } else {
        const { type, content, uuid } = data.content;
        // For tool call invocations, we need to update the existing message entirely since it is accumulated
        // and we dont know if the function will have arguments or not while streaming - so replace the existing message entirely
        if (type === "toolCallInvocation") {
          const knownMessage = prev.find((msg) => msg.uuid === uuid);
          if (!knownMessage)
            return [...prev, { uuid, type: "toolCallInvocation", content }]; // If the message is not known, add it to the end of the list
          return [
            ...prev.filter((msg) => msg.uuid !== uuid),
            { ...knownMessage, content },
          ]; // If the message is known, replace it with the new content
        }

        if (type === "usageMetrics") {
          if (!data.content.metrics) return prev;
          return prev.map((msg) =>
            msg.uuid === uuid ? { ...msg, metrics: data.content.metrics } : msg,
          );
        }

        if (type === "citations") {
          if (!data.content.citations) return prev;
          return prev.map((msg) =>
            msg.uuid === uuid
              ? {
                  ...msg,
                  sources: [...(msg.sources || []), ...data.content.citations],
                }
              : msg,
          );
        }

        if (type === "chatId") {
          if (!data.content.chatId) return prev;
          return prev.map((msg) =>
            msg.uuid === uuid ? { ...msg, chatId: data.content.chatId } : msg,
          );
        }

        if (type === "textResponseChunk") {
          return prev
            .map((msg) =>
              msg.uuid === uuid
                ? {
                    ...msg,
                    type: "textResponse",
                    content: (msg.content || "") + (content || ""),
                  }
                : msg?.content
                  ? msg
                  : null,
            )
            .filter((msg) => !!msg);
        }

        // Generic text response - will be put in the agent thought bubble
        return prev.map((msg) =>
          msg.uuid === data.content.uuid
            ? {
                ...msg,
                content: (msg.content || "") + (data.content.content || ""),
              }
            : msg,
        );
      }
    });
  }

  if (data.type === "reportPreview") {
    // Dispatch a window event so ReportPreviewListener inside ChatContainer
    // can call openPreview() from ChatSidebarContext.
    window.dispatchEvent(
      new CustomEvent(REPORT_PREVIEW_EVENT, { detail: data.content }),
    );
    return;
  }

  if (data.type === "fileDownloadCard") {
    return setChatHistory((prev) => {
      return [
        ...prev.filter((msg) => !!msg.content),
        {
          type: "fileDownloadCard",
          uuid: v4(),
          content: data.content,
          role: "assistant",
          sources: [],
          closed: true,
          error: null,
          animate: false,
          pending: false,
          // #55: marks this card as freshly streamed so the UI can auto-open
          // the preview sidebar. Not persisted in chat history, so reloads
          // never re-trigger the auto-open.
          justGenerated: true,
          metrics: data.metrics || {},
        },
      ];
    });
  }

  if (data.type === "rechartVisualize") {
    return setChatHistory((prev) => {
      return [
        ...prev.filter((msg) => !!msg.content),
        {
          type: "rechartVisualize",
          uuid: v4(),
          content: data.content,
          role: "assistant",
          sources: [],
          closed: true,
          error: null,
          animate: false,
          pending: false,
          metrics: data.metrics || {},
        },
      ];
    });
  }

  if (data.type === "wssFailure") {
    return setChatHistory((prev) => {
      return [
        ...prev.filter((msg) => !!msg.content),
        {
          uuid: v4(),
          content: data.content,
          role: "assistant",
          sources: [],
          closed: true,
          error: data.content,
          animate: false,
          pending: false,
          metrics: {},
        },
      ];
    });
  }

  if (data.type === "toolApprovalRequest") {
    return setChatHistory((prev) => {
      return [
        ...prev.filter((msg) => !!msg.content),
        {
          uuid: v4(),
          type: "toolApprovalRequest",
          requestId: data.requestId,
          skillName: data.skillName,
          payload: data.payload,
          description: data.description,
          timeoutMs: data.timeoutMs,
          content: `Approval requested for ${data.skillName}`,
          role: "assistant",
          sources: [],
          closed: false,
          error: null,
          animate: false,
          pending: true,
          metrics: {},
        },
      ];
    });
  }

  if (data.type === "clarificationRequest") {
    return setChatHistory((prev) => {
      return [
        ...prev.filter((msg) => !!msg.content),
        {
          uuid: v4(),
          type: "clarifyingQuestion",
          requestId: data.requestId,
          questions: data.questions || [],
          allowSkip: data.allowSkip !== false,
          timeoutMs: data.timeoutMs,
          content: `Agent has ${data.questions?.length || 0} question${
            (data.questions?.length || 0) === 1 ? "" : "s"
          }`,
          role: "assistant",
          sources: [],
          closed: false,
          error: null,
          animate: false,
          pending: true,
          metrics: {},
        },
      ];
    });
  }

  return setChatHistory((prev) => {
    return [
      ...prev.filter((msg) => !!msg.content),
      {
        uuid: v4(),
        type: data.type,
        content: data.content,
        role: "assistant",
        sources: [],
        closed: true,
        error: null,
        animate: (data as any)?.animate || false,
        pending: false,
        metrics: (data as any).metrics || {},
      },
    ];
  });
}

let _agentSessionActive = false;
export function setAgentSessionActive(value: boolean) {
  _agentSessionActive = value;
}
export function getAgentSessionActive() {
  return _agentSessionActive;
}

export function useIsAgentSessionActive() {
  const [activeSession, setActiveSession] = useState(
    () => !!getAgentSessionActive(),
  );
  useEffect(() => {
    if (!window) return;
    const handleStart = () => setActiveSession(true);
    const handleEnd = () => setActiveSession(false);
    window.addEventListener(AGENT_SESSION_START, handleStart);
    window.addEventListener(AGENT_SESSION_END, handleEnd);
    return () => {
      window.removeEventListener(AGENT_SESSION_START, handleStart);
      window.removeEventListener(AGENT_SESSION_END, handleEnd);
    };
  }, []);

  return activeSession;
}
