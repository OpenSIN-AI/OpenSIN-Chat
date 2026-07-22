// SPDX-License-Identifier: MIT
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import { ErrorBoundary } from "react-error-boundary";
import DnDFileUploaderWrapper from "./DnDWrapper";
import { ChatSidebarProvider, useChatSidebar } from "./ChatSidebar";
import { ChatTooltips } from "./ChatTooltips";
import useChatContainerQuickScroll from "@/hooks/useChatContainerQuickScroll";
import ReportPreviewListener from "./ReportPreviewListener";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import { lazy, Suspense } from "react";
import useChatStream from "./useChatStream";
import ErrorBoundaryFallback from "@/components/ErrorBoundaryFallback";
import NotebookShell from "@/features/notebook/NotebookShell";
import useNotebookMode from "@/features/notebook/useNotebookMode";
import useSelectedCodeRunner from "@/features/code-runners/useSelectedCodeRunner";
import { buildChatRequestContext } from "@/features/chat/chat-request-context";
import usePendingSearchNavigation from "@/features/global-search/usePendingSearchNavigation";

// Lazy: Sidebars host + icon rail; individual panels split further inside.
const Sidebars = lazy(() => import("./Sidebars"));
// PERF: EmptyState (+ PromptInput) only for empty threads.
const EmptyState = lazy(() => import("./EmptyState"));

export default function ChatContainer({
  workspace,
  threadSlug = null,
  knownHistory = [] as any[],
}) {
  const isMobile = useIsMobileLayout();
  const { chatHistoryRef } = useChatContainerQuickScroll();
  const { modeId: notebookMode } = useNotebookMode({
    notebookSlug: workspace?.slug,
    threadSlug,
  });

  const { runnerId: selectedCodeRunnerId } = useSelectedCodeRunner(workspace?.slug);

  const {
    loadingResponse,
    chatHistory,
    setChatHistory,
    websocket,
    files,
    isEmpty,
    handleSubmit,
    sendCommand,
    regenerateAssistantMessage,
  } = useChatStream({
    workspace,
    threadSlug,
    knownHistory,
    notebookMode,
    buildRequestContext: () =>
      buildChatRequestContext({
        notebookSlug: workspace?.slug,
        threadSlug,
        codeRunnerId: selectedCodeRunnerId,
      }),
  });

  return (
    <ChatSidebarProvider>
      <ReportPreviewListener />
      <ChatContainerInner
        workspace={workspace}
        threadSlug={threadSlug}
        isMobile={isMobile}
        chatHistoryRef={chatHistoryRef}
        loadingResponse={loadingResponse}
        chatHistory={chatHistory}
        setChatHistory={setChatHistory}
        websocket={websocket}
        files={files}
        isEmpty={isEmpty}
        handleSubmit={handleSubmit}
        sendCommand={sendCommand}
        regenerateAssistantMessage={regenerateAssistantMessage}
      />
    </ChatSidebarProvider>
  );
}

function ChatContainerInner({
  workspace,
  threadSlug,
  isMobile,
  chatHistoryRef,
  loadingResponse,
  chatHistory,
  setChatHistory,
  websocket,
  files,
  isEmpty,
  handleSubmit,
  sendCommand,
  regenerateAssistantMessage,
}: any) {
  const { activeSidebar, openSidebar, closeSidebar } = useChatSidebar();

  usePendingSearchNavigation({
    workspaceSlug: workspace?.slug,
    threadSlug,
    openSidebar,
  });

  return (
    <NotebookShell
      workspace={workspace}
      activeSidebar={activeSidebar}
      openSidebar={openSidebar}
      closeSidebar={closeSidebar}
      sourceCount={Array.isArray(workspace?.documents) ? workspace.documents.length : 0}
    >
      <div
        style={{
          "--content-height": isMobile ? "100%" : "calc(100% - 32px)",
        }}
        className="relative z-[2] flex h-[var(--content-height)] min-w-0 flex-1 overflow-hidden md:ml-0 md:my-[16px] md:mr-[60px]"
      >
        <ChatHeader workspaceSlug={workspace?.slug} isEmpty={isEmpty} />
        <main className="relative h-full min-w-0 flex-1 overflow-hidden bg-[var(--chat-canvas)] text-[var(--chat-text)] md:rounded-2xl md:border md:border-[var(--chat-border)]">
          <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
            <DnDFileUploaderWrapper>
              {isEmpty ? (
                <Suspense
                  fallback={
                    <div
                      className="flex h-full w-full items-center justify-center"
                      aria-busy="true"
                    >
                      <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
                    </div>
                  }
                >
                  <EmptyState
                    workspace={workspace}
                    handleSubmit={handleSubmit}
                    sendCommand={sendCommand}
                    loadingResponse={loadingResponse}
                    files={files}
                    workspaceSlug={workspace?.slug}
                    threadSlug={threadSlug}
                  />
                </Suspense>
              ) : (
                <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
                  <MessageList
                    chatHistoryRef={chatHistoryRef}
                    chatHistory={chatHistory}
                    workspace={workspace}
                    sendCommand={sendCommand}
                    setChatHistory={setChatHistory}
                    regenerateAssistantMessage={regenerateAssistantMessage}
                    websocket={websocket}
                    loadingResponse={loadingResponse}
                    handleSubmit={handleSubmit}
                    files={files}
                  />
                </ErrorBoundary>
              )}
            </DnDFileUploaderWrapper>
          </ErrorBoundary>
          <ChatTooltips />
        </main>
      </div>
      <Suspense fallback={null}>
        <Sidebars workspace={workspace} />
      </Suspense>
    </NotebookShell>
  );
}
