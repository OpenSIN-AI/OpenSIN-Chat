// SPDX-License-Identifier: MIT
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import PromptInput from "./PromptInput";
import WorkspaceSources from "@/components/lib/WorkspaceSources";
import SuggestedMessages from "@/components/lib/SuggestedMessages";
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
}

function CapabilityCard({ icon: Icon, title, description, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-2 p-3.5 rounded-xl border border-theme-border bg-zinc-800/50 light:bg-slate-50 hover:bg-zinc-800 light:hover:bg-slate-100 transition-all text-left w-full"
    >
      <div className="w-7 h-7 rounded-lg bg-theme-accent/20 flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-theme-accent" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-white light:text-slate-900">
          {title}
        </span>
        <span className="text-[11px] text-zinc-400 light:text-slate-500 leading-tight">
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
  }, [workspace]);

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
      onClick: () => {},
    },
  ];

  return (
    <div className="flex flex-col h-full w-full items-center justify-start overflow-y-auto pt-[8%]">
      <div className="flex flex-col items-center w-full max-w-[750px]">
        <h1 className="text-white light:text-theme-text-primary text-xl md:text-2xl mb-2 text-center">
          {t("main-page.greeting")}
        </h1>
        {modelName && (
          <div className="flex items-center gap-x-1.5 mb-6">
            <span className="inline-flex items-center gap-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-theme-accent/10 text-theme-accent border border-theme-accent/20">
              <Sparkle size={11} weight="fill" />
              {modelName}
            </span>
          </div>
        )}
        {!modelName && <div className="mb-6" />}

        <PromptInput
          workspace={workspace}
          submit={handleSubmit}
          isStreaming={loadingResponse}
          sendCommand={sendCommand}
          attachments={files}
          centered={true}
        />

        <div className="grid grid-cols-2 gap-2.5 w-full mt-4 mb-4">
          {capabilities.map((cap, idx) => (
            <CapabilityCard
              key={idx}
              icon={cap.icon}
              title={cap.title}
              description={cap.description}
              onClick={cap.onClick}
            />
          ))}
        </div>

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
