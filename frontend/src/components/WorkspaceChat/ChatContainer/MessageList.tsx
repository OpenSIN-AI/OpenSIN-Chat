// SPDX-License-Identifier: MIT
import ChatHistory from "./ChatHistory";
import PromptInput from "./PromptInput";
import { MetricsProvider } from "./ChatHistory/HistoricalMessage/Actions/RenderMetrics";

/**
 * Chat history with MetricsProvider and PromptInput.
 * Accepts: chatHistoryRef, chatHistory, workspace, sendCommand,
 *          setChatHistory, regenerateAssistantMessage, websocket
 */
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
}) {
  return (
    <div className="flex flex-col h-full w-full pb-20 md:pb-0">
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
