// SPDX-License-Identifier: MIT
import PromptInput from "./PromptInput";
import WorkspaceSources from "@/components/lib/WorkspaceSources";
import SuggestedMessages from "@/components/lib/SuggestedMessages";

/**
 * Empty state rendering when no chat history exists yet.
 * Accepts: workspace, handleSubmit, sendCommand, loadingResponse, files, t
 */
export default function EmptyState({
  workspace,
  handleSubmit,
  sendCommand,
  loadingResponse,
  files,
  t,
}) {
  return (
    <div className="flex flex-col h-full w-full items-center justify-center">
      <div className="flex flex-col items-center w-full max-w-[750px]">
        <h1 className="text-white text-xl md:text-2xl mb-11 text-center">
          {t("main-page.greeting")}
        </h1>
        <PromptInput
          workspace={workspace}
          submit={handleSubmit}
          isStreaming={loadingResponse}
          sendCommand={sendCommand}
          attachments={files}
          centered={true}
        />
        <WorkspaceSources
          documents={workspace?.documents || []}
          onAddSources={() =>
            document.getElementById("dnd-chat-file-uploader")?.click()
          }
        />
      </div>
      <SuggestedMessages
        suggestedMessages={workspace?.suggestedMessages}
        sendCommand={sendCommand}
      />
    </div>
  );
}
