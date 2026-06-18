// SPDX-License-Identifier: MIT
import { isMobile } from "react-device-detect";
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

export default function ChatContainer({
  workspace,
  threadSlug = null,
  knownHistory = [],
}) {
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
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative flex md:ml-[16px] md:mr-[16px] md:my-[16px] flex-1 min-w-0 z-[2]"
      >
        <ChatHeader workspaceSlug={workspace.slug} isEmpty={isEmpty} />
        <div
          className={`flex-1 min-w-0 transition-all duration-500 relative md:rounded-[16px] bg-zinc-900 light:bg-white w-full h-full overflow-hidden border-none light:border-solid light:border light:border-theme-modal-border${isEmpty ? "" : " text-white light:text-slate-900"}`}
        >
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
            )}
          </DnDFileUploaderWrapper>
          <ChatTooltips />
        </div>
        <Sidebars workspace={workspace} />
      </div>
    </ChatSidebarProvider>
  );
}
