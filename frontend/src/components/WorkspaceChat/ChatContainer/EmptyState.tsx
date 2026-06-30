// SPDX-License-Identifier: MIT
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import PromptInput from "./PromptInput";
import AgentModeButton, { useAgentMode } from "./PromptInput/AgentModeButton";
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
      className="group flex flex-col gap-2 p-4 rounded-xl border border-white/10 light:border-slate-200 bg-white/[0.03] light:bg-slate-50 hover:bg-white/[0.08] light:hover:bg-slate-100 hover:border-white/20 light:hover:border-slate-300 transition-all text-left w-full"
    >
      <div className="w-8 h-8 rounded-lg bg-theme-accent/15 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-theme-accent" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-white light:text-slate-900">
          {title}
        </span>
        <span className="text-xs text-zinc-500 light:text-slate-500 leading-tight">
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
  const agentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const agentMode = useAgentMode();

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
      onClick: () => toggleSidebar("sources"),
    },
  ];

  return (
    <div className="flex flex-col h-full w-full items-center justify-center overflow-y-auto px-2 md:px-6">
      <div className="flex flex-col items-center w-full max-w-[800px] py-8">
        <h1 className="text-white light:text-theme-text-primary text-2xl md:text-3xl font-semibold mb-3 text-center tracking-tight">
          {t("main-page.greeting")}
        </h1>
        {modelName && (
          <div className="flex items-center gap-x-1.5 mb-8">
            <span className="inline-flex items-center gap-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-theme-accent/10 text-theme-accent border border-theme-accent/20">
              <Sparkle size={11} weight="fill" />
              {modelName}
            </span>
          </div>
        )}
        {!modelName && <div className="mb-8" />}

        <div className="flex items-center gap-x-2 mb-3">
          <AgentModeButton
            sendCommand={sendCommand}
            promptInput=""
            textareaRef={agentTextareaRef}
            visible={true}
            {...agentMode}
          />
          <span className="text-xs text-zinc-400 light:text-slate-500">
            {t2("chat_window.start_agent_session")}
          </span>
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

        <div className="grid grid-cols-2 gap-3 w-full mt-6">
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
      </div>
    </div>
  );
}
