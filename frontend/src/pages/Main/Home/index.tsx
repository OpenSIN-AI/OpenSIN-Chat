// SPDX-License-Identifier: MIT
// Purpose: Main home page that bootstraps an empty/default workspace and hosts the prompt input.
// Docs: index.doc.md
import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import {
  PROMPT_INPUT_EVENT,
  PROMPT_INPUT_ID,
} from "@/components/WorkspaceChat/ChatContainer/PromptInput";
import DnDFileUploaderWrapper, {
  DndUploaderContext,
  DnDFileUploaderProvider,
  PASTE_ATTACHMENT_EVENT,
} from "@/components/WorkspaceChat/ChatContainer/DnDWrapper";
import EmptyState from "@/components/WorkspaceChat/ChatContainer/EmptyState";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import {
  LAST_VISITED_WORKSPACE,
  PENDING_HOME_MESSAGE,
} from "@/utils/constants";
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import { safeJsonParse } from "@/utils/request";
import { safeGetItem } from "@/utils/safeStorage";
import { invalidateThreads } from "@/hooks/useThreads";
import useUser from "@/hooks/useUser";
import ChatSettingsMenu from "@/components/WorkspaceChat/ChatContainer/ChatSettingsMenu";
import WorkspaceModelPicker from "@/components/WorkspaceChat/ChatContainer/WorkspaceModelPicker";
import { ChatTooltips } from "@/components/WorkspaceChat/ChatContainer/ChatTooltips";
import { ChatSidebarProvider } from "@/components/WorkspaceChat/ChatContainer/ChatSidebar";
import Sidebars from "@/components/WorkspaceChat/ChatContainer/Sidebars";
import logger from "@/utils/logger";

interface HomeWorkspace {
  slug: string;
  documents?: any[];
  suggestedMessages?: any[];
  showAgentCommand?: boolean;
  [key: string]: any;
}

async function getTargetWorkspace(): Promise<HomeWorkspace | null> {
  const lastVisited = safeJsonParse(safeGetItem(LAST_VISITED_WORKSPACE));
  if (lastVisited?.slug) {
    const workspace = await Workspace.bySlug(lastVisited.slug);
    if (workspace) return workspace as HomeWorkspace;
  }

  const workspaces = await Workspace.all();
  return workspaces.length > 0 ? (workspaces[0] as HomeWorkspace) : null;
}

async function createDefaultWorkspace(
  workspaceName = "My Workspace",
): Promise<HomeWorkspace | null> {
  const { workspace, message: errorMsg } = await Workspace.new({
    name: workspaceName,
  });
  if (!workspace) {
    showToast(errorMsg || i18next.t("home.createWorkspaceFailed"), "error");
    return null;
  }
  return workspace as HomeWorkspace;
}

export default function Home() {
  const isMobile = useIsMobileLayout();
  const { t } = useTranslation();
  const { user } = useUser();
  const [workspace, setWorkspace] = useState<HomeWorkspace | null>(null);
  const [threadSlug, setThreadSlug] = useState<string | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const pendingFilesRef = useRef<File[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        let ws = await getTargetWorkspace();
        if (cancelled) return;

        // Home tools such as notes require a workspace even before the first
        // chat message is sent. Create the default workspace during bootstrap
        // instead of leaving these tools visible but non-functional.
        if (!ws && user?.role !== "default") {
          ws = await createDefaultWorkspace(
            i18next.t("new-workspace.placeholder"),
          );
        }

        if (ws) {
          const [suggestedMessages, { showAgentCommand }] = await Promise.all([
            Workspace.getSuggestedMessages(ws.slug),
            Workspace.agentCommandAvailable(ws.slug),
          ]);
          if (cancelled) return;
          setWorkspace({
            ...ws,
            suggestedMessages,
            showAgentCommand,
          });
        }
      } catch (e) {
        logger.error("Failed to initialize home workspace:", e);
      }
      if (!cancelled) setWorkspaceLoading(false);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // When workspace/thread becomes available and we have pending files, trigger upload
  useEffect(() => {
    if (workspace && threadSlug && pendingFilesRef.current.length > 0) {
      const files = pendingFilesRef.current;
      pendingFilesRef.current = [];
      window.dispatchEvent(
        new CustomEvent(PASTE_ATTACHMENT_EVENT, { detail: { files } }),
      );
    }
  }, [workspace, threadSlug]);

  // Handle paste events when no thread exists yet
  useEffect(() => {
    if (threadSlug) return;

    async function handlePaste(e: Event) {
      const files = (e as any).detail?.files as File[] | undefined;
      if (!files?.length) return;

      pendingFilesRef.current = files;
      try {
        let ws = workspace;
        if (!ws) {
          ws = await createDefaultWorkspace(t("new-workspace.placeholder"));
          if (!ws) return;
          setWorkspace(ws);
        }
        const { thread } = await Workspace.threads.new(ws.slug);
        if (thread) {
          setThreadSlug(thread.slug);
          invalidateThreads(ws.slug);
        }
      } catch (e) {
        logger.error("Failed to handle paste:", e);
      }
    }

    window.addEventListener(PASTE_ATTACHMENT_EVENT, handlePaste);
    return () =>
      window.removeEventListener(PASTE_ATTACHMENT_EVENT, handlePaste);
  }, [workspace, threadSlug]);

  async function handleDropWithoutWorkspace(acceptedFiles: File[]) {
    setDragging(false);
    pendingFilesRef.current = acceptedFiles;
    try {
      const ws = await createDefaultWorkspace(t("new-workspace.placeholder"));
      if (!ws) return;
      setWorkspace(ws);
      const { thread } = await Workspace.threads.new(ws.slug);
      if (thread) {
        setThreadSlug(thread.slug);
        invalidateThreads(ws.slug);
      }
    } catch (e) {
      logger.error("Failed to handle drop:", e);
    }
  }

  async function handleDropWithWorkspace(acceptedFiles: File[]) {
    setDragging(false);
    pendingFilesRef.current = acceptedFiles;
    try {
      const { thread } = await Workspace.threads.new(workspace!.slug);
      if (thread) {
        setThreadSlug(thread.slug);
        invalidateThreads(workspace!.slug);
      }
    } catch (e) {
      logger.error("Failed to handle drop:", e);
    }
  }

  if (workspaceLoading) {
    return <HomeSkeleton />;
  }

  if (!workspace && user?.role === "default") {
    return <NoWorkspacesAssigned />;
  }

  if (workspace && threadSlug) {
    return (
      <DnDFileUploaderProvider workspace={workspace} threadSlug={threadSlug}>
        <HomeContent
          workspace={workspace}
          setWorkspace={setWorkspace}
          threadSlug={threadSlug}
          setThreadSlug={setThreadSlug}
        />
      </DnDFileUploaderProvider>
    );
  }

  return (
    <DndUploaderContext.Provider
      value={{
        files: [],
        ready: true,
        dragging,
        setDragging,
        onDrop: workspace
          ? handleDropWithWorkspace
          : handleDropWithoutWorkspace,
        parseAttachments: () => [],
      }}
    >
      <HomeContent
        workspace={workspace}
        setWorkspace={setWorkspace}
        threadSlug={null}
        setThreadSlug={setThreadSlug}
      />
    </DndUploaderContext.Provider>
  );
}

interface HomeContentProps {
  workspace: HomeWorkspace | null;
  setWorkspace: React.Dispatch<React.SetStateAction<HomeWorkspace | null>>;
  threadSlug: string | null;
  setThreadSlug: React.Dispatch<React.SetStateAction<string | null>>;
}

function HomeContent({
  workspace,
  setWorkspace,
  threadSlug,
  setThreadSlug,
}: HomeContentProps) {
  const isMobile = useIsMobileLayout();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const { files, parseAttachments } = useContext(DndUploaderContext);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(PROMPT_INPUT_EVENT, {
        detail: { messageContent: "", writeMode: "replace" },
      }),
    );
  }, []);

  async function submitMessage(message: string, attachments: any[] = []) {
    if (!message || loading) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      let targetWorkspace = workspace;
      let targetThread = threadSlug;

      if (!targetWorkspace) {
        targetWorkspace = await createDefaultWorkspace(
          t("new-workspace.placeholder"),
        );
        if (!targetWorkspace) {
          setLoading(false);
          submittingRef.current = false;
          return;
        }
        setWorkspace(targetWorkspace);
      }

      if (!targetThread) {
        const { thread } = await Workspace.threads.new(targetWorkspace.slug);
        targetThread = thread?.slug;
        if (thread) {
          setThreadSlug(thread.slug);
          invalidateThreads(targetWorkspace.slug);
        }
      }

      sessionStorage.setItem(
        PENDING_HOME_MESSAGE,
        JSON.stringify({ message, attachments }),
      );

      if (targetThread) {
        navigate(paths.workspace.thread(targetWorkspace.slug, targetThread));
      } else {
        navigate(paths.workspace.chat(targetWorkspace.slug));
      }
    } catch (error) {
      logger.error("Error submitting message:", error);
      showToast(t("home.sendMessageFailed"), "error");
      setLoading(false);
      submittingRef.current = false;
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const currentMessage =
      (
        document.getElementById(PROMPT_INPUT_ID) as HTMLInputElement | null
      )?.value?.trim() || "";
    await submitMessage(currentMessage, parseAttachments());
  }

  function sendCommand({
    text = "",
    autoSubmit = false,
    writeMode = "replace",
  }: {
    text?: string;
    autoSubmit?: boolean;
    writeMode?: string;
  }) {
    if (autoSubmit) {
      if (writeMode === "append") {
        const currentText =
          (document.getElementById(PROMPT_INPUT_ID) as HTMLInputElement | null)
            ?.value ?? "";
        text = currentText + text;
      }
      if (!text.trim()) return;
      submitMessage(text.trim());
      return;
    }
    window.dispatchEvent(
      new CustomEvent(PROMPT_INPUT_EVENT, {
        detail: { messageContent: text, writeMode },
      }),
    );
  }

  return (
    <ChatSidebarProvider>
      <div
        style={
          {
            "--content-height": isMobile ? "100%" : "calc(100% - 32px)",
          } as React.CSSProperties
        }
        className="relative z-[2] flex h-[var(--content-height)] min-w-0 flex-1 md:m-4"
      >
        <ChatSettingsMenu />
        <div className="relative h-full w-full min-w-0 flex-1 overflow-hidden bg-theme-bg-container">
          <WorkspaceModelPicker workspaceSlug={workspace?.slug} />
          <DnDFileUploaderWrapper>
            <EmptyState
              workspace={workspace}
              handleSubmit={handleSubmit}
              sendCommand={sendCommand}
              loadingResponse={loading}
              files={files}
              t={t}
              workspaceSlug={workspace?.slug}
              threadSlug={threadSlug}
            />
          </DnDFileUploaderWrapper>
          <ChatTooltips />
        </div>
        <Sidebars workspace={workspace} />
      </div>
    </ChatSidebarProvider>
  );
}

function HomeSkeleton() {
  const { t } = useTranslation();
  return (
    <div
      className="relative flex h-full min-w-0 flex-1 items-center justify-center overflow-hidden bg-theme-bg-container px-4 md:m-4 md:rounded-2xl md:border md:border-theme-modal-border"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-2xl flex-col items-center gap-6">
        <div className="h-8 w-64 max-w-full animate-pulse rounded-lg bg-theme-bg-tertiary" />
        <div className="h-28 w-full animate-pulse rounded-2xl border border-theme-modal-border bg-theme-bg-secondary" />
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-xl border border-theme-modal-border bg-theme-bg-secondary"
            />
          ))}
        </div>
      </div>
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}

function NoWorkspacesAssigned() {
  const isMobile = useIsMobileLayout();
  const { t } = useTranslation();
  return (
    <div
      style={
        {
          "--content-height": isMobile ? "100%" : "calc(100% - 32px)",
        } as React.CSSProperties
      }
      className="h-[var(--content-height)] transition-all duration-500 relative md:ml-[16px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-zinc-900 light:bg-white w-full overflow-hidden"
    >
      <div className="flex flex-col h-full w-full items-center justify-center">
        <p className="text-theme-text-secondary text-sm text-center whitespace-pre-line">
          {t("home.notAssigned")}
        </p>
      </div>
    </div>
  );
}
