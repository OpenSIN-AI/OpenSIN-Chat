// SPDX-License-Identifier: MIT
// Purpose: Virtualizes and renders the workspace conversation as a compact, readable message stream.
// Docs: index.doc.md
import {
  useImperativeHandle,
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
  lazy,
  Suspense,
} from "react";
import type { Ref } from "react";
import type { VirtuosoHandle } from "react-virtuoso";
import { Virtuoso } from "react-virtuoso";
import HistoricalMessage from "./HistoricalMessage";
import PromptReply from "./PromptReply";
import StatusResponse from "./StatusResponse";
import ToolApprovalRequest from "./ToolApprovalRequest";
import ClarifyingQuestionCard from "./ClarifyingQuestion";
import FileDownloadCard from "./FileDownloadCard";
import { useManageWorkspaceModal } from "../../../Modals/ManageWorkspace";
import ManageWorkspace from "../../../Modals/ManageWorkspace";
import { ArrowDown } from "@phosphor-icons/react/dist/csr/ArrowDown";
// Chartable (echarts) wird LAZY geladen, damit der Chart-Vendor-Chunk
// nicht im initialen Bundle landet.
const Chartable = lazy(() => import("./Chartable"));
import ModelRouteNotification from "./ModelRouteNotification";
import Workspace from "@/models/workspace";
import { useParams } from "react-router";
import paths from "@/utils/paths";
import Appearance from "@/models/appearance";
import useTextSize from "@/hooks/useTextSize";
import { ThoughtExpansionProvider } from "./ThoughtContainer";
import { MessageActionsProvider } from "./MessageActionsContext";
import { invalidateChatHistory } from "@/hooks/useChatHistory";
import { useTranslation } from "react-i18next";

function buildRows({ history, workspace, websocket, t }: any) {
  const rows: any[] = [];
  let statusGroup: any[] | null = null;

  for (let index = 0; index < history.length; index++) {
    const props = history[index];
    const isLastBotReply =
      index === history.length - 1 && props.role === "assistant";

    if (props?.type === "statusResponse" && !!props.content) {
      if (!statusGroup) statusGroup = [];
      statusGroup.push(props);
      continue;
    }
    if (statusGroup) {
      rows.push({
        kind: "statusGroup",
        id: `status-group-${statusGroup[0].uuid ?? statusGroup[0].id ?? statusGroup[0].chatId ?? "x"}-${rows.length}`,
        messages: statusGroup,
      });
      statusGroup = null;
    }

    if (props.type === "modelRouteNotification") {
      const lastMsg = history[history.length - 1];
      const isLast =
        index === history.length - 1 ||
        (index === history.length - 2 &&
          (lastMsg?.animate || lastMsg?.pending));
      const isStreaming =
        isLast &&
        (index === history.length - 1 || lastMsg?.animate || lastMsg?.pending);
      rows.push({
        kind: "route",
        id: `route-${props.uuid ?? index}`,
        routedTo: props.routedTo,
        isStreaming,
      });
      continue;
    }

    if (props.type === "toolApprovalRequest") {
      rows.push({
        kind: "toolApproval",
        id: `tool-approval-${props.requestId}`,
        requestId: props.requestId,
        skillName: props.skillName,
        payload: props.payload,
        description: props.description,
        timeoutMs: props.timeoutMs,
        websocket,
      });
      continue;
    }

    if (props.type === "clarifyingQuestion") {
      rows.push({
        kind: "clarifying",
        id: `clarify-${props.requestId}`,
        requestId: props.requestId,
        questions: props.questions,
        allowSkip: props.allowSkip,
        timeoutMs: props.timeoutMs,
        websocket,
      });
      continue;
    }

    if (props.type === "rechartVisualize" && !!props.content) {
      rows.push({
        kind: "rechart",
        id: `rechart-${props.uuid ?? index}`,
        uuid: props.uuid,
        chartProps: props,
        t,
      });
    } else if (props.type === "fileDownloadCard" && !!props.content) {
      rows.push({
        kind: "fileDownload",
        id: `file-${props.uuid ?? index}`,
        uuid: props.uuid,
        chartProps: props,
        autoPreview: !!props.justGenerated,
      });
    } else if (isLastBotReply && props.animate) {
      rows.push({
        kind: "promptReply",
        id: `prompt-reply-${props.uuid ?? index}`,
        uuid: props.uuid,
        reply: props.content,
        pending: props.pending,
        sources: props.sources,
        error: props.error,
        errorId: props.errorId,
        closed: props.closed,
      });
    } else {
      rows.push({
        kind: "historical",
        id: `historical-${props.uuid ?? `${props.chatId ?? "x"}-${props.role}-${index}`}`,
        uuid: props.uuid,
        message: props.content,
        role: props.role,
        workspace,
        sources: props.sources,
        feedbackScore: props.feedbackScore,
        chatId: props.chatId,
        error: props.error,
        attachments: props.attachments,
        isLastMessage: isLastBotReply,
        metrics: props.metrics,
        outputs: props.outputs,
        clarifyingQuestions: props.clarifyingQuestions,
      });
    }
  }
  if (statusGroup) {
    rows.push({
      kind: "statusGroup",
      id: `status-group-${statusGroup[0].uuid ?? statusGroup[0].id ?? statusGroup[0].chatId ?? "x"}-${rows.length}`,
      messages: statusGroup,
    });
  }
  return rows;
}

export default function ChatHistory(
  {
    history = [],
    workspace,
    sendCommand,
    updateHistory,
    regenerateAssistantMessage,
    websocket = null,
    ref,
  }: any & { ref?: Ref<{ scrollToTop: () => void; scrollToBottom: () => void }> },
) {
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const lastScrollTopRef = useRef(0);
  const { t } = useTranslation();
  const { threadSlug = null } = useParams();
  const { showing, hideModal } = useManageWorkspaceModal();
  const [isAtBottom, setIsAtBottom] = useState(true as any);
  const isStreaming = history[history.length - 1]?.animate;
  const { showScrollbar } = Appearance.getSettings();
  const { textSizeClass } = useTextSize();

  const saveEditedMessage = useCallback(
    async ({
      editedMessage,
      chatId,
      role,
      attachments = [],
      saveOnly = false,
    }: any) => {
      if (!editedMessage) return;

      if (role === "user" && saveOnly) {
        const targetIdx = history.findIndex((msg) => msg.chatId === chatId);
        if (targetIdx < 0) return;
        const updatedHistory = history.map((msg, idx) =>
          idx === targetIdx ? { ...msg, content: editedMessage } : msg,
        );
        updateHistory(updatedHistory);
        await Workspace.updateChat(
          workspace.slug,
          threadSlug,
          chatId,
          editedMessage,
          "user",
        );
        invalidateChatHistory(workspace.slug, threadSlug);
        return;
      }

      if (role === "user") {
        const targetIdx = history.findIndex((msg) => msg.chatId === chatId);
        if (targetIdx < 0) return;
        const updatedHistory = history.slice(0, targetIdx + 1);
        updatedHistory[updatedHistory.length - 1] = {
          ...updatedHistory[updatedHistory.length - 1],
          content: editedMessage,
        };
        await Workspace.deleteEditedChats(workspace.slug, threadSlug, chatId);
        sendCommand({
          text: editedMessage,
          autoSubmit: true,
          history: updatedHistory,
          attachments,
        });
        return;
      }

      if (role === "assistant") {
        const targetIdx = history.findIndex(
          (msg) => msg.chatId === chatId && msg.role === role,
        );
        if (targetIdx < 0) return;
        const updatedHistory = history.map((msg, idx) =>
          idx === targetIdx ? { ...msg, content: editedMessage } : msg,
        );
        updateHistory(updatedHistory);
        await Workspace.updateChat(
          workspace.slug,
          threadSlug,
          chatId,
          editedMessage,
        );
        invalidateChatHistory(workspace.slug, threadSlug);
        return;
      }
    },
    [history, workspace?.slug, threadSlug, sendCommand, updateHistory],
  );

  const forkThread = useCallback(
    async (chatId: any) => {
      const newThreadSlug = await Workspace.forkThread(
        workspace.slug,
        threadSlug,
        chatId,
      );
      if (!newThreadSlug) return;
      invalidateChatHistory(workspace.slug, threadSlug);
      window.location.href = paths.workspace.thread(
        workspace.slug,
        newThreadSlug,
      );
    },
    [workspace?.slug, threadSlug],
  );

  const stableRegenerate = useCallback(
    (chatId: any) => regenerateAssistantMessage?.(chatId),
    [regenerateAssistantMessage],
  );

  const compiledRows = useMemo(
    () => buildRows({ history, workspace, websocket, t }),
    [history, workspace, websocket, t],
  );
  const lastMessageInfo = useMemo(() => getLastMessageInfo(history), [history]);

  const scrollVirtuosoToBottom = useCallback((smooth: boolean) => {
    const handle: any = virtuosoRef.current;
    if (!handle) return;
    handle.scrollTo({
      top: 1_000_000_000,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const scrollVirtuosoToTop = useCallback(() => {
    virtuosoRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      scrollToTop: () => scrollVirtuosoToTop(),
      scrollToBottom: () => scrollVirtuosoToBottom(!isStreaming),
    }),
    [scrollVirtuosoToBottom, scrollVirtuosoToTop, isStreaming],
  );

  const handleScrollState = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
  }, []);

  const wasEmptyRef = useRef(true);
  const prevRowCountRef = useRef(0);
  useEffect(() => {
    if (wasEmptyRef.current && compiledRows.length > 0) {
      wasEmptyRef.current = false;
      requestAnimationFrame(() => {
        const virtuoso = virtuosoRef.current;
        if (virtuoso && virtuoso.scrollToIndex) {
          virtuoso.scrollToIndex({
            index: compiledRows.length - 1,
            behavior: "smooth",
          });
        }
      });
    }
  }, [compiledRows]);

  useEffect(() => {
    if (compiledRows.length > prevRowCountRef.current) {
      requestAnimationFrame(() => {
        scrollVirtuosoToBottom(false);
      });
    }
    prevRowCountRef.current = compiledRows.length;
  }, [compiledRows.length, scrollVirtuosoToBottom]);

  const renderRow = useCallback(
    (row: any, index: number) => {
      switch (row.kind) {
        case "statusGroup": {
          const hasSubsequentMessages = index < compiledRows.length - 1;
          return (
            <StatusResponse
              messages={row.messages}
              isThinking={!hasSubsequentMessages && lastMessageInfo.isAnimating}
            />
          );
        }
        case "route":
          return (
            <ModelRouteNotification
              routedTo={row.routedTo}
              isStreaming={row.isStreaming}
            />
          );
        case "toolApproval":
          return (
            <ToolApprovalRequest
              requestId={row.requestId}
              skillName={row.skillName}
              payload={row.payload}
              description={row.description}
              timeoutMs={row.timeoutMs}
              websocket={row.websocket}
            />
          );
        case "clarifying":
          return (
            <ClarifyingQuestionCard
              requestId={row.requestId}
              questions={row.questions}
              allowSkip={row.allowSkip}
              timeoutMs={row.timeoutMs}
              websocket={row.websocket}
            />
          );
        case "rechart":
          return (
            <Suspense
              fallback={
                <div className="text-theme-text-secondary text-xs italic">
                  {row.t("chat_window.chart_loading")}
                </div>
              }
            >
              <Chartable props={row.chartProps} />
            </Suspense>
          );
        case "fileDownload":
          return (
            <FileDownloadCard
              props={row.chartProps}
              autoPreview={row.autoPreview}
            />
          );
        case "promptReply":
          return (
            <PromptReply
              uuid={row.uuid}
              reply={row.reply}
              pending={row.pending}
              sources={row.sources}
              error={row.error}
              errorId={row.errorId}
              closed={row.closed}
            />
          );
        case "historical":
          return (
            <HistoricalMessage
              uuid={row.uuid}
              message={row.message}
              role={row.role}
              workspace={row.workspace}
              sources={row.sources}
              feedbackScore={row.feedbackScore}
              chatId={row.chatId}
              error={row.error}
              attachments={row.attachments}
              regenerateMessage={stableRegenerate}
              isLastMessage={row.isLastMessage}
              saveEditedMessage={saveEditedMessage}
              forkThread={forkThread}
              metrics={row.metrics}
              outputs={row.outputs}
              clarifyingQuestions={row.clarifyingQuestions}
            />
          );
        default:
          return null;
      }
    },
    [
      compiledRows,
      lastMessageInfo,
      saveEditedMessage,
      forkThread,
      stableRegenerate,
    ],
  );

  const computeItemKey = useCallback((_index: number, row: any) => row.id, []);

  return (
    <MessageActionsProvider>
      <ThoughtExpansionProvider>
        <div
          id="chat-history"
          role="log"
          aria-live="polite"
          aria-label={t("chat.aria.chatHistory")}
          className={`markdown relative flex h-full flex-col items-center justify-start bg-[var(--chat-canvas)] pb-[152px] pt-4 font-light text-[var(--chat-text)] md:pb-[144px] md:pt-6 ${textSizeClass}`}
        >
          <Virtuoso
            ref={virtuosoRef}
            data={compiledRows}
            computeItemKey={computeItemKey}
            itemContent={(index, row) => (
              <div className="mx-auto w-full max-w-3xl min-w-0 px-4 md:px-6">
                {renderRow(row, index)}
              </div>
            )}
            followOutput={(isAtBottom) => {
              // Use "auto" during streaming to avoid janky smooth-scroll
              // on every chunk; use "smooth" for initial load.
              return isAtBottom ? "smooth" : "auto";
            }}
            atBottomStateChange={handleScrollState}
            className="h-full w-full overflow-y-scroll"
            defaultItemHeight={64}
            increaseViewportBy={{ top: 600, bottom: 600 }}
          />
          {showing && (
            <ManageWorkspace
              hideModal={hideModal}
              providedSlug={workspace.slug}
            />
          )}
          {!isAtBottom && (
            <div className="absolute bottom-[136px] left-1/2 z-30 -translate-x-1/2 md:bottom-[128px]">
              <button
                type="button"
                onClick={() => {
                  scrollVirtuosoToBottom(!isStreaming);
                }}
                aria-label={t("chat.aria.scrollToBottom")}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--chat-border)] bg-[var(--chat-surface)] text-[var(--chat-text-muted)] shadow-lg transition-colors hover:border-[var(--chat-accent)] hover:text-[var(--chat-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-focus-ring)]"
              >
                <ArrowDown weight="bold" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </ThoughtExpansionProvider>
    </MessageActionsProvider>
  );
}

const getLastMessageInfo: any = (history: any) => {
  const lastMessage = history?.[history.length - 1] || {};
  return {
    isAnimating: lastMessage?.animate,
    isStatusResponse: lastMessage?.type === "statusResponse",
  };
};
