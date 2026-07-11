// SPDX-License-Identifier: MIT
import ChatHistory from "./ChatHistory";
import PromptInput from "./PromptInput";
import { MetricsProvider } from "./ChatHistory/HistoricalMessage/Actions/RenderMetrics";
import { useTranslation } from "react-i18next";

/**
 * Chat history with MetricsProvider and PromptInput.
 * Accepts: chatHistoryRef, chatHistory, workspace, sendCommand,
 *          setChatHistory, regenerateAssistantMessage, websocket
 */
interface MessageListProps {
  chatHistoryRef: React.RefObject<HTMLDivElement | null>;
  chatHistory: any[];
  workspace: any;
  sendCommand: (cmd: any) => void;
  setChatHistory: (history: any[]) => void;
  regenerateAssistantMessage: (idx: number) => void;
  websocket: any;
  loadingResponse: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  files: any[];
}

export default function MessageList({
  chatHistoryRef,
  chatHistory,
  workspace,
  sendCommand,
  setChatHistory,
  regenerateAssistantMessage,
  websocket,
  loadingResponse,
  handleSubmit,
  files,
}: MessageListProps) {
  const { t } = useTranslation();
  const hasHistory = chatHistory.length > 0;

  return (
    <div className="flex h-full w-full flex-col bg-[var(--chat-canvas)]">
      <div className="contents">
        {hasHistory ? (
          <MetricsProvider>
            <ChatHistory
              ref={chatHistoryRef}
              history={chatHistory}
              workspace={workspace}
              sendCommand={sendCommand}
              updateHistory={setChatHistory}
              regenerateAssistantMessage={regenerateAssistantMessage}
              websocket={websocket}
            />
          </MetricsProvider>
        ) : (
          <div className="flex-1 flex items-center justify-center px-4">
            <p className="text-sm text-center text-theme-text-secondary light:text-slate-500">
              {t("chat.history.empty")}
            </p>
          </div>
        )}
        <PromptInput
          workspace={workspace}
          submit={handleSubmit}
          isStreaming={loadingResponse}
          sendCommand={sendCommand}
          attachments={files}
          centered={false}
        />
      </div>
    </div>
  );
}
