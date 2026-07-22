// SPDX-License-Identifier: MIT

import PromptInput from "./PromptInput";
import { useChatSidebar } from "./ChatSidebar";
import NotebookModeCards from "@/features/notebook/NotebookModeCards";
import NotebookQuickActions from "@/features/notebook/NotebookQuickActions";
import RecentNotebookSources from "@/features/notebook/RecentNotebookSources";
import useNotebookMode from "@/features/notebook/useNotebookMode";

interface EmptyStateProps {
  workspace: any;
  handleSubmit: (event: React.FormEvent) => void;
  sendCommand: (command: any) => void;
  loadingResponse: boolean;
  files: any[];
  workspaceSlug?: string;
  threadSlug?: string | null;
}

function notebookQuestion(mode: "chat" | "work" | "code"): string {
  switch (mode) {
    case "work": return "Was soll erledigt werden?";
    case "code": return "Was möchtest du bauen oder ändern?";
    case "chat":
    default: return "Womit kann ich helfen?";
  }
}

function notebookDescription(mode: "chat" | "work" | "code"): string {
  switch (mode) {
    case "work": return "Recherchiere, plane und erledige Aufgaben mit deinen Quellen.";
    case "code": return "Arbeite mit Repositories und deinen verbundenen Coding-Agenten.";
    case "chat":
    default: return "Frage frei oder nutze die Quellen dieses Notebooks.";
  }
}

export default function EmptyState({ workspace, handleSubmit, sendCommand, loadingResponse, files, workspaceSlug, threadSlug }: EmptyStateProps) {
  const { openSidebar } = useChatSidebar();
  const notebookSlug = workspaceSlug || workspace?.slug || null;
  const notebookMode = useNotebookMode({ notebookSlug, threadSlug });

  function usePrompt(prompt: string) {
    sendCommand({ text: prompt, writeMode: "replace" });
    requestAnimationFrame(() => {
      const input = document.getElementById("primary-prompt-input") as HTMLTextAreaElement | null;
      input?.focus();
      input?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  return (
    <section aria-labelledby="notebook-welcome-title" className="h-full w-full overflow-y-auto bg-[var(--chat-canvas)]">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-6 text-center">
          <h1 id="notebook-welcome-title" className="text-balance text-2xl font-semibold tracking-tight text-[var(--chat-text)] sm:text-3xl">
            {notebookQuestion(notebookMode.modeId)}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-pretty text-sm leading-6 text-[var(--chat-text-muted)]">
            {notebookDescription(notebookMode.modeId)}
          </p>
        </header>

        <div className="mb-3">
          <NotebookModeCards value={notebookMode.modeId} onChange={notebookMode.setModeId} />
        </div>

        <PromptInput
          workspace={workspace}
          submit={handleSubmit}
          isStreaming={loadingResponse}
          sendCommand={sendCommand}
          attachments={files}
          centered
          workspaceSlug={notebookSlug}
          threadSlug={threadSlug}
        />

        <div className="mt-6 flex flex-col gap-6">
          <RecentNotebookSources workspace={workspace} onOpenSources={() => openSidebar("sources")} />
          <NotebookQuickActions mode={notebookMode.modeId} onSelect={usePrompt} />
        </div>

        <p className="mt-8 text-center text-[10px] leading-4 text-theme-text-muted">
          OpenSIN kann Fehler machen. Prüfe wichtige Angaben und ausgeführte Aktionen.
        </p>
      </div>
    </section>
  );
}
