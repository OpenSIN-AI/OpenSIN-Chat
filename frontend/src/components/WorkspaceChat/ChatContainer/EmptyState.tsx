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
      className="group flex items-start gap-3 p-3.5 rounded-lg border border-white/[0.05] light:border-zinc-200 bg-transparent hover:bg-white/[0.03] light:hover:bg-zinc-50 hover:border-white/[0.09] light:hover:border-zinc-300 transition-all text-left w-full"
    >
      <div className="mt-0.5 w-6 h-6 rounded-md border border-white/[0.06] light:border-zinc-200 bg-white/[0.04] light:bg-zinc-100 flex items-center justify-center flex-shrink-0">
        <Icon size={13} className="text-[#71717a] light:text-zinc-400" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-[#e4e4e7] light:text-zinc-800">
          {title}
        </span>
        <span className="text-xs text-[#52525b] light:text-zinc-400 leading-relaxed">
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
    <div className="flex flex-col h-full w-full items-center overflow-y-auto px-2 md:px-6">
      <div className="flex flex-col items-center w-full max-w-[720px] py-8 my-auto">
        <h1 className="text-[#e4e4e7] light:text-zinc-900 text-2xl md:text-[1.75rem] font-semibold mb-2.5 text-center tracking-tight text-balance">
          {t("main-page.greeting")}
        </h1>
        {modelName && (
          <div className="flex items-center gap-x-1.5 mb-7">
            <span className="inline-flex items-center gap-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.04] light:bg-zinc-100 text-[#71717a] light:text-zinc-500 border border-white/[0.06] light:border-zinc-200">
              <Sparkle size={10} weight="fill" />
              {modelName}
            </span>
          </div>
        )}
        {!modelName && <div className="mb-7" />}

        <div className="flex items-center gap-x-2 mb-2.5">
          <AgentModeButton
            sendCommand={sendCommand}
            promptInput=""
            textareaRef={agentTextareaRef}
            visible={true}
            {...agentMode}
          />
          <span className="text-xs text-[#52525b] light:text-zinc-400">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mt-5">
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
