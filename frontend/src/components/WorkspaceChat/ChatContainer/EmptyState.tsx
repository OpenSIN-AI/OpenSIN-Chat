// SPDX-License-Identifier: MIT
// Purpose: Renders the first-chat workspace with quick actions and the centred prompt input.
// Docs: EmptyState.doc.md
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import PromptInput from "./PromptInput";
import { Books } from "@phosphor-icons/react/dist/csr/Books";
import { Notepad } from "@phosphor-icons/react/dist/csr/Notepad";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
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
      className="group flex min-h-20 w-full items-start gap-3 rounded-lg border border-theme-modal-border bg-theme-bg-secondary p-4 text-left transition-colors hover:border-theme-text-muted hover:bg-theme-bg-hover focus:outline-none focus:ring-2 focus:ring-white/20"
    >
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-theme-modal-border bg-theme-bg-tertiary">
        <Icon size={16} className="text-theme-text-secondary" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-theme-text-primary">
          {title}
        </span>
        <span className="text-sm leading-relaxed text-theme-text-secondary">
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
      title: t2("chat.capability_sources", "Quellen durchsuchen"),
      description: t2(
        "chat.capability_sources_desc",
        "Durchsuche deine hochgeladenen Dokumente",
      ),
      onClick: () => toggleSidebar("sources"),
    },
    {
      icon: Notepad,
      title: t2("chat.capability_notes", "Notizen machen"),
      description: t2(
        "chat.capability_notes_desc",
        "Schreibe Notizen direkt im Workspace",
      ),
      onClick: () => toggleSidebar("notepad"),
    },
    {
      icon: Database,
      title: t2("chat.capability_database", "Politiker-Datenbank"),
      description: t2(
        "chat.capability_database_desc",
        "Durchsuche Bundestags-Daten",
      ),
      onClick: () => toggleSidebar("database"),
    },
    {
      icon: Sparkle,
      title: t2("chat.capability_rag", "KI mit Quellen"),
      description: t2(
        "chat.capability_rag_desc",
        "Antworten basierend auf deinen Dokumenten",
      ),
      onClick: () => toggleSidebar("sources"),
    },
  ];

  return (
    <div className="flex h-full w-full flex-col items-center overflow-y-auto px-3 md:px-6">
      <div className="my-auto flex w-full max-w-[720px] flex-col items-center py-8">
        <h1 className="mb-2.5 text-center text-2xl font-semibold tracking-tight text-[#e4e4e7] text-balance light:text-zinc-900 md:text-[1.75rem]">
          {t("main-page.greeting")}
        </h1>
        {modelName && (
          <div className="flex items-center gap-x-1.5 mb-7">
            <span className="inline-flex items-center gap-x-1 rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-[#a1a1aa] light:border-zinc-200 light:bg-zinc-100 light:text-zinc-600">
              <Sparkle size={10} weight="fill" />
              {modelName}
            </span>
          </div>
        )}
        {!modelName && <div className="mb-7" />}

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

        <div className="mt-6 grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3">
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
    </div>
  );
}
