// SPDX-License-Identifier: MIT
import PromptInput from "./PromptInput";
import WorkspaceSources from "@/components/lib/WorkspaceSources";
import SuggestedMessages from "@/components/lib/SuggestedMessages";

/**
 * Empty state rendering when no chat history exists yet.
 * Accepts: workspace, handleSubmit, sendCommand, loadingResponse, files, t
 */
interface EmptyStateProps {
  workspace: any;
  handleSubmit: (e: React.FormEvent) => void;
  sendCommand: (cmd: any) => void;
  loadingResponse: boolean;
  files: any[];
  t: (key: string) => string;
}

export default function EmptyState({
  workspace,
  handleSubmit,
  sendCommand,
  loadingResponse,
  files,
  t,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col h-full w-full items-center justify-start overflow-y-auto pt-[10%]">
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
