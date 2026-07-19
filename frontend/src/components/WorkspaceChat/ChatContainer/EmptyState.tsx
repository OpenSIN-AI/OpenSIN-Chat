// SPDX-License-Identifier: MIT
// Purpose: Renders the first-chat workspace with quick actions and the centred prompt input.
// Docs: EmptyState.doc.md
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import PromptInput from "./PromptInput";
import { Books } from "@phosphor-icons/react/dist/csr/Books";
import { Notepad } from "@phosphor-icons/react/dist/csr/Notepad";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import { useChatSidebar } from "./ChatSidebar";

interface EmptyStateProps {
  workspace: any;
  handleSubmit: (e: React.FormEvent) => void;
  sendCommand: (cmd: any) => void;
  loadingResponse: boolean;
  files: any[];
  t: (key: string) => string;
  workspaceSlug?: string;
  threadSlug?: string;
}

function CapabilityCard({ icon: Icon, title, description, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-16 w-full items-center gap-3 rounded-xl bg-[var(--chat-surface)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--chat-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-focus-ring)] sm:min-h-20 sm:items-start sm:p-3"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--chat-surface-elevated)] text-[var(--chat-accent)] sm:mt-0.5">
        <Icon size={17} />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium text-[var(--chat-text)]">
          {title}
        </span>
        <span className="hidden text-sm leading-5 text-[var(--chat-text-muted)] min-[380px]:block">
          {description}
        </span>
      </div>
    </button>
  );
}

export default function EmptyState({
  workspace,
  handleSubmit,
  sendCommand,
  loadingResponse,
  files,
  t,
  workspaceSlug,
  threadSlug,
}: EmptyStateProps) {
  const { t: t2 } = useTranslation();
  const { toggleSidebar } = useChatSidebar();
  const [modelName, setModelName] = useState("");
  useEffect(() => {
    const rawModel = workspace?.chatModel || "";
    if (rawModel) {
      const parts = rawModel.split("/");
      const friendly = parts[parts.length - 1] || rawModel;
      setModelName(friendly.replace(/-/g, " "));
    }
  }, [workspace?.chatModel]);

  const capabilities = [
    {
      icon: Books,
      title: t2("chat.capability_sources"),
      description: t2("chat.capability_sources_desc"),
      onClick: () => toggleSidebar("sources"),
    },
    {
      icon: Notepad,
      title: t2("chat.capability_notes"),
      description: t2("chat.capability_notes_desc"),
      onClick: () => toggleSidebar("notepad"),
    },
    {
      icon: Database,
      title: t2("chat.capability_database"),
      description: t2("chat.capability_database_desc"),
      onClick: () => toggleSidebar("database"),
    },
    {
      icon: FilePdf,
      title: t2("right_sidebar.icon_pdf_analysis", "PDF-Analyse"),
      description: t2("chat.capability_pdf_desc", "PDF-Dokumente analysieren und befragen"),
      onClick: () => toggleSidebar("pdf-analysis"),
    },
  ];

  return (
    <section
      aria-labelledby="chat-welcome-title"
      className="flex h-full w-full flex-col items-center overflow-y-auto bg-[var(--chat-canvas)] px-3 md:px-6"
    >
      <div className="flex w-full max-w-3xl flex-col items-center py-4 sm:my-auto sm:py-6 md:py-8">
        <div className="mb-4 flex w-full flex-col items-center text-center sm:mb-5">
          <span className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--chat-accent)] sm:mb-3 sm:text-xs">
            {t2("chat.welcome.eyebrow")}
          </span>
          <h1
            id="chat-welcome-title"
            className="text-balance text-2xl font-semibold tracking-tight text-[var(--chat-text)] sm:text-3xl md:text-4xl"
          >
            {t("main-page.greeting")}
          </h1>
          <p className="mt-2 max-w-xl text-pretty text-sm leading-5 text-[var(--chat-text-muted)] sm:mt-3 sm:leading-6 md:text-base">
            {t2("chat.welcome.description")}
          </p>
          {modelName && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--chat-surface)] px-2.5 py-1 text-xs text-[var(--chat-text-muted)] sm:mt-4">
              <Sparkle
                size={12}
                weight="fill"
                className="text-[var(--chat-accent)]"
              />
              {t2("chat.welcome.model", { model: modelName })}
            </span>
          )}
        </div>

        <PromptInput
          workspace={workspace}
          submit={handleSubmit}
          isStreaming={loadingResponse}
          sendCommand={sendCommand}
          attachments={files}
          centered={true}
          workspaceSlug={workspaceSlug}
          threadSlug={threadSlug}
        />

        <div
          role="group"
          aria-label={t2("chat.aria.capabilities")}
          className="mt-3 grid w-full grid-cols-2 gap-2 sm:mt-4"
        >
          {capabilities.map((cap) => (
            <CapabilityCard
              key={cap.title}
              icon={cap.icon}
              title={cap.title}
              description={cap.description}
              onClick={cap.onClick}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
