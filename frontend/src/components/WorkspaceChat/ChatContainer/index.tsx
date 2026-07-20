// SPDX-License-Identifier: MIT
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import { ErrorBoundary } from "react-error-boundary";
import DnDFileUploaderWrapper from "./DnDWrapper";
import { ChatSidebarProvider, useChatSidebar } from "./ChatSidebar";
import { ChatTooltips } from "./ChatTooltips";
import useChatContainerQuickScroll from "@/hooks/useChatContainerQuickScroll";
import ReportPreviewListener from "./ReportPreviewListener";
import ChatHeader from "./ChatHeader";
import EmptyState from "./EmptyState";
import MessageList from "./MessageList";
import { lazy, Suspense } from "react";
import useChatStream from "./useChatStream";
import ErrorBoundaryFallback from "@/components/ErrorBoundaryFallback";

// Lazy: Sidebars host + icon rail; individual panels split further inside.
const Sidebars = lazy(() => import("./Sidebars"));

export default function ChatContainer({
  workspace,
  threadSlug = null,
  knownHistory = [],
}) {
  const isMobile = useIsMobileLayout();
  const { chatHistoryRef } = useChatContainerQuickScroll();
  const {
    t,
    loadingResponse,
    chatHistory,
    setChatHistory,
    websocket,
    files,
    isEmpty,
    handleSubmit,
    sendCommand,
    regenerateAssistantMessage,
  } = useChatStream({ workspace, threadSlug, knownHistory });

  return (
    <ChatSidebarProvider>
      <ReportPreviewListener />
      <ChatContainerInner
        workspace={workspace}
        threadSlug={threadSlug}
        knownHistory={knownHistory}
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
  knownHistory,
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
  const { t } = useChatSidebar();

  return (
    <>
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
                <EmptyState
                  workspace={workspace}
                  handleSubmit={handleSubmit}
                  sendCommand={sendCommand}
                  loadingResponse={loadingResponse}
                  files={files}
                  t={t}
                />
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
    </>
  );
}
