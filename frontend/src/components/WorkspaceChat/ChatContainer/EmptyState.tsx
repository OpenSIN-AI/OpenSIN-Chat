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
      className="group flex min-h-24 w-full items-start gap-3 rounded-xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-4 text-left transition-colors hover:border-[var(--chat-accent)] hover:bg-[var(--chat-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-focus-ring)]"
    >
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--chat-border)] bg-[var(--chat-surface-elevated)] text-[var(--chat-accent)]">
        <Icon size={18} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--chat-text)]">
          {title}
        </span>
        <span className="text-sm leading-relaxed text-[var(--chat-text-muted)]">
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
      icon: Sparkle,
      title: t2("chat.capability_rag"),
      description: t2("chat.capability_rag_desc"),
      onClick: () => toggleSidebar("sources"),
    },
  ];

  return (
    <section
      aria-labelledby="chat-welcome-title"
      className="flex h-full w-full flex-col items-center overflow-y-auto bg-[var(--chat-canvas)] px-3 md:px-6"
    >
      <div className="my-auto flex w-full max-w-3xl flex-col items-center py-8 md:py-12">
        <div className="mb-6 flex max-w-2xl flex-col items-center text-center">
          <span className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--chat-accent)]">
            {t2("chat.welcome.eyebrow")}
          </span>
          <h1
            id="chat-welcome-title"
            className="text-balance text-3xl font-semibold tracking-tight text-[var(--chat-text)] md:text-4xl"
          >
            {t("main-page.greeting")}
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-sm leading-6 text-[var(--chat-text-muted)] md:text-base">
            {t2("chat.welcome.description")}
          </p>
          {modelName && (
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--chat-border)] bg-[var(--chat-surface)] px-3 py-1 text-xs text-[var(--chat-text-muted)]">
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
          className="mt-5 grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
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
