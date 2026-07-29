// SPDX-License-Identifier: MIT

import PromptInput from "./PromptInput";
import NotebookQuickActions from "@/features/notebook/NotebookQuickActions";
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

function welcomeTitle(mode: "chat" | "work" | "code"): string {
  switch (mode) {
    case "work":
      return "Was soll erledigt werden?";
    case "code":
      return "Was möchtest du bauen oder ändern?";
    case "chat":
    default:
      return "Womit kann ich helfen?";
  }
}

function welcomeDescription(mode: "chat" | "work" | "code"): string {
  switch (mode) {
    case "work":
      return "Recherchiere, plane und erledige Aufgaben mit optionalen Quellen.";
    case "code":
      return "Arbeite mit Repositories und verbundenen Coding-Werkzeugen.";
    case "chat":
    default:
      return "Schreib eine Nachricht oder füge bei Bedarf Dateien und Quellen hinzu.";
  }
}

export default function EmptyState({
  workspace,
  handleSubmit,
  sendCommand,
  loadingResponse,
  files,
  workspaceSlug,
  threadSlug,
}: EmptyStateProps) {
  const workspaceContext = workspaceSlug || workspace?.slug || null;
  const mode = useNotebookMode({ notebookSlug: workspaceContext, threadSlug });

  function usePrompt(prompt: string) {
    sendCommand({ text: prompt, writeMode: "replace" });
    requestAnimationFrame(() => {
      const input = document.getElementById(
        "primary-prompt-input",
      ) as HTMLTextAreaElement | null;
      input?.focus();
      input?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  return (
    <section
      aria-labelledby="chat-welcome-title"
      className="h-full w-full overflow-y-auto bg-[var(--chat-canvas)]"
    >
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-6 text-center">
          <h1
            id="chat-welcome-title"
            className="text-balance text-2xl font-semibold tracking-tight text-[var(--chat-text)] sm:text-3xl"
          >
            {welcomeTitle(mode.modeId)}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-pretty text-sm leading-6 text-[var(--chat-text-muted)]">
            {welcomeDescription(mode.modeId)}
          </p>
        </header>

        <PromptInput
          workspace={workspace}
          submit={handleSubmit}
          isStreaming={loadingResponse}
          sendCommand={sendCommand}
          attachments={files}
          centered
          workspaceSlug={workspaceContext}
          threadSlug={threadSlug}
        />

        <div className="mt-5">
          <NotebookQuickActions mode={mode.modeId} onSelect={usePrompt} />
        </div>

        <p className="mt-7 text-center text-[10px] leading-4 text-theme-text-muted">
          KI kann Fehler machen. Prüfe wichtige Angaben und ausgeführte
          Aktionen.
        </p>
      </div>
    </section>
  );
}
