// SPDX-License-Identifier: MIT
import ChatHistory from "./ChatHistory";
import PromptInput from "./PromptInput";
import { MetricsProvider } from "./ChatHistory/HistoricalMessage/Actions/RenderMetrics";

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
  return (
    <div className="flex flex-col h-full w-full">
      <div className="contents">
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
