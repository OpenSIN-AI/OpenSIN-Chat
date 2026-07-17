// SPDX-License-Identifier: MIT
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import { ErrorBoundary } from "react-error-boundary";
import DnDFileUploaderWrapper from "./DnDWrapper";
import { ChatSidebarProvider } from "./ChatSidebar";
import { ChatTooltips } from "./ChatTooltips";
import useChatContainerQuickScroll from "@/hooks/useChatContainerQuickScroll";
import ReportPreviewListener from "./ReportPreviewListener";
import ChatHeader from "./ChatHeader";
import EmptyState from "./EmptyState";
import MessageList from "./MessageList";
import Sidebars from "./Sidebars";
import useChatStream from "./useChatStream";
import ErrorBoundaryFallback from "@/components/ErrorBoundaryFallback";

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
      <div
        style={{
          "--content-height": isMobile ? "100%" : "calc(100% - 32px)",
        }}
        className="relative z-[2] flex h-[var(--content-height)] min-w-0 flex-1 overflow-hidden md:mx-[16px] md:my-[16px]"
      >
        <ChatHeader workspaceSlug={workspace?.slug} isEmpty={isEmpty} />
        <main className="relative h-full min-w-0 flex-1 overflow-hidden bg-[var(--chat-canvas)] text-[var(--chat-text)] md:rounded-2xl md:border md:border-[var(--chat-border)]">
          <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
            <DnDFileUploaderWrapper>
              {/* Threads should always show the chat interface, even when empty,
                  so that the workspace home greeting does not appear inside a thread. */}
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
              <Sidebars workspace={workspace} />
            </DnDFileUploaderWrapper>
          </ErrorBoundary>
          <ChatTooltips />
        </main>
      </div>
    </ChatSidebarProvider>
  );
}
