// SPDX-License-Identifier: MIT
// Purpose: Main home page that bootstraps an empty/default workspace and hosts the prompt input.
// Docs: index.doc.md
import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { isMobile } from "react-device-detect";
import { SidebarMobileHeader } from "@/components/Sidebar";
import PromptInput, {
  PROMPT_INPUT_EVENT,
  PROMPT_INPUT_ID,
} from "@/components/WorkspaceChat/ChatContainer/PromptInput";
import DnDFileUploaderWrapper, {
  DndUploaderContext,
  DnDFileUploaderProvider,
  PASTE_ATTACHMENT_EVENT,
} from "@/components/WorkspaceChat/ChatContainer/DnDWrapper";
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
import WorkspaceSources from "@/components/lib/WorkspaceSources";
import SuggestedMessages from "@/components/lib/SuggestedMessages";
import useUser from "@/hooks/useUser";
import ChatSettingsMenu from "@/components/WorkspaceChat/ChatContainer/ChatSettingsMenu";
import WorkspaceModelPicker from "@/components/WorkspaceChat/ChatContainer/WorkspaceModelPicker";
import { ChatTooltips } from "@/components/WorkspaceChat/ChatContainer/ChatTooltips";
import { ChatSidebarProvider } from "@/components/WorkspaceChat/ChatContainer/ChatSidebar";
import Sidebars from "@/components/WorkspaceChat/ChatContainer/Sidebars";

interface HomeWorkspace {
  slug: string;
  documents?: any[];
  suggestedMessages?: any[];
  showAgentCommand?: boolean;
  [key: string]: any;
}

async function getTargetWorkspace(): Promise<HomeWorkspace | null> {
  const lastVisited = safeJsonParse(
    safeGetItem(LAST_VISITED_WORKSPACE),
  );
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
  const { t } = useTranslation();
  const { user } = useUser();
  const [workspace, setWorkspace] = useState<HomeWorkspace | null>(null);
  const [threadSlug, setThreadSlug] = useState<string | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const pendingFilesRef = useRef<File[]>([]);

  useEffect(() => {
    async function init() {
      const ws = await getTargetWorkspace();
      if (ws) {
        const [suggestedMessages, { showAgentCommand }] = await Promise.all([
          Workspace.getSuggestedMessages(ws.slug),
          Workspace.agentCommandAvailable(ws.slug),
        ]);
        setWorkspace({
          ...ws,
          suggestedMessages,
          showAgentCommand,
        });
      }
      setWorkspaceLoading(false);
    }
    init();
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
    }

    window.addEventListener(PASTE_ATTACHMENT_EVENT, handlePaste);
    return () =>
      window.removeEventListener(PASTE_ATTACHMENT_EVENT, handlePaste);
  }, [workspace, threadSlug]);

  async function handleDropWithoutWorkspace(acceptedFiles: File[]) {
    setDragging(false);
    pendingFilesRef.current = acceptedFiles;
    const ws = await createDefaultWorkspace(t("new-workspace.placeholder"));
    if (!ws) return;
    setWorkspace(ws);
    const { thread } = await Workspace.threads.new(ws.slug);
    if (thread) {
      setThreadSlug(thread.slug);
      invalidateThreads(ws.slug);
    }
  }

  async function handleDropWithWorkspace(acceptedFiles: File[]) {
    setDragging(false);
    pendingFilesRef.current = acceptedFiles;
    const { thread } = await Workspace.threads.new(workspace!.slug);
    if (thread) {
      setThreadSlug(thread.slug);
      invalidateThreads(workspace!.slug);
    }
  }

  if (workspaceLoading) {
    return (
      <div
        style={
          {
            "--content-height": isMobile ? "100%" : "calc(100% - 32px)",
          } as React.CSSProperties
        }
        className="h-[var(--content-height)] transition-all duration-500 relative md:ml-[16px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-zinc-900 light:bg-white w-full overflow-hidden"
      />
    );
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
      console.error("Error submitting message:", error);
      showToast(t("home.sendMessageFailed"), "error");
      setLoading(false);
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
        className="h-[var(--content-height)] relative flex md:ml-[16px] md:mr-[16px] md:my-[16px] flex-1 min-w-0 z-[2]"
      >
        <ChatSettingsMenu />
        <div className="flex-1 min-w-0 transition-all duration-500 relative md:rounded-[16px] bg-zinc-900 light:bg-white w-full h-full overflow-hidden border-none light:border-solid light:border light:border-theme-modal-border">
          {isMobile && <SidebarMobileHeader />}
          <WorkspaceModelPicker workspaceSlug={workspace?.slug} />
          <DnDFileUploaderWrapper>
            <div className="flex flex-col h-full w-full items-center justify-center">
              <div className="flex flex-col items-center w-full max-w-[750px]">
                <h1 className="text-white text-xl md:text-2xl mb-11 text-center">
                  {t("main-page.greeting")}
                </h1>
                <PromptInput
                  workspace={workspace}
                  submit={handleSubmit}
                  isStreaming={loading}
                  sendCommand={sendCommand}
                  attachments={files}
                  centered={true}
                  workspaceSlug={workspace?.slug}
                  threadSlug={threadSlug}
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
          </DnDFileUploaderWrapper>
          <ChatTooltips />
        </div>
        <Sidebars workspace={workspace} />
      </div>
    </ChatSidebarProvider>
  );
}

function NoWorkspacesAssigned() {
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
        <p className="text-white/60 text-sm text-center whitespace-pre-line">
          {t("home.notAssigned")}
        </p>
      </div>
    </div>
  );
}
