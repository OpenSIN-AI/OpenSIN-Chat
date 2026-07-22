// SPDX-License-Identifier: MIT
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { default as WorkspaceChatContainer } from "@/components/WorkspaceChat";
import LeftSidebarIconBar from "@/components/WorkspaceChat/ChatContainer/LeftSidebarIconBar";
import {
  SidebarToggleProvider,
  useSidebarToggle,
} from "@/components/Sidebar/SidebarToggle";
import { Navigate, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ChatCircle } from "@phosphor-icons/react/dist/csr/ChatCircle";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { SquaresFour } from "@phosphor-icons/react/dist/csr/SquaresFour";
import { CalendarBlank } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { GearSix } from "@phosphor-icons/react/dist/csr/GearSix";
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import { FullScreenLoader } from "@/components/Preloader";
import { LAST_VISITED_WORKSPACE } from "@/utils/constants";
import { safeSetItem } from "@/utils/safeStorage";
import useWorkspaceChats from "@/hooks/useWorkspaceChats";
import useWorkspaces from "@/hooks/useWorkspaces";
import useThreads, { invalidateThreads } from "@/hooks/useThreads";
import useUser from "@/hooks/useUser";
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import type { CommandItem } from "@/components/Workspace/CommandPalette/CommandPalette";
import { NAVIGATE_HOME_EVENT } from "@/utils/keyboardShortcuts";

// PERF (CEO): same left-rail split as Main — threads/footer after shell paint.
const Sidebar = lazy(() => import("@/components/Sidebar"));
const SidebarMobileHeader = lazy(() =>
  import("@/components/Sidebar").then((m) => ({
    default: m.SidebarMobileHeader,
  })),
);
const CommandPalette = lazy(() =>
  import("@/components/Workspace/CommandPalette/CommandPalette").then((m) => ({
    default: m.CommandPalette,
  })),
);

export default function WorkspaceChat() {
  const { loading, requiresAuth, mode } = usePasswordModal();

  if (loading) return <FullScreenLoader />;
  if (requiresAuth !== false) {
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;
  }

  return (
    <SidebarToggleProvider>
      <WorkspaceChatLayout />
    </SidebarToggleProvider>
  );
}

function WorkspaceChatLayout() {
  const { t } = useTranslation();
  const { showSidebar } = useSidebarToggle();
  const { slug } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobileLayout();
  const { user } = useUser();
  const { workspaces } = useWorkspaces({ ordered: true });
  const { threads } = useThreads(slug ?? null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const railVisible = !isMobile && !showSidebar;

  const createChat = useCallback(async () => {
    if (!slug || creating) return;
    setCreating(true);
    try {
      const { thread, error } = await Workspace.threads.new(slug);
      if (error || !thread?.slug)
        throw new Error(error || t("commandHub.createFailed"));
      await invalidateThreads(slug);
      navigate(paths.workspace.thread(slug, thread.slug));
    } catch (error: any) {
      showToast(
        t("activeWorkspaces.chatCreateFailed", {
          error: error?.message || error,
        }),
        "error",
        { clear: true },
      );
    } finally {
      setCreating(false);
    }
  }, [creating, navigate, slug, t]);

  const commandItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      {
        id: "new-chat",
        group: "quickActions",
        label: t("commandHub.actions.newChat"),
        description: t("commandHub.actions.newChatDescription"),
        shortcut: "⌘N",
        icon: <Plus size={17} />,
        keywords: ["new", "chat"],
        perform: createChat,
      },
      {
        id: "docs",
        group: "navigation",
        label: t("commandHub.actions.docs"),
        description: t("commandHub.actions.docsDescription"),
        icon: <BookOpen size={17} />,
        keywords: ["help", "documentation"],
        perform: () => navigate(paths.docs()),
      },
    ];

    if (slug) {
      items.push({
        id: "workspace-settings",
        group: "quickActions",
        label: t("commandHub.actions.workspaceSettings"),
        description: t("commandHub.actions.workspaceSettingsDescription"),
        icon: <GearSix size={17} />,
        keywords: ["settings", "preferences"],
        perform: () =>
          navigate(paths.workspace.settings.generalAppearance(slug)),
      });
    }

    if (user?.role !== "default") {
      items.push({
        id: "scheduled",
        group: "quickActions",
        label: t("commandHub.actions.scheduled"),
        description: t("commandHub.actions.scheduledDescription"),
        icon: <CalendarBlank size={17} />,
        keywords: ["jobs", "tasks", "schedule"],
        perform: () => navigate(paths.settings.scheduledJobs()),
      });
    }

    threads.slice(0, 8).forEach((thread: any) => {
      items.push({
        id: `thread-${thread.slug}`,
        group: "recent",
        label: thread.name || t("commandHub.untitledChat"),
        description: t("commandHub.inWorkspace", {
          name:
            workspaces.find((workspace: any) => workspace.slug === slug)
              ?.name || slug,
        }),
        icon: <ChatCircle size={17} />,
        keywords: ["conversation", "thread", "recent"],
        perform: () => navigate(paths.workspace.thread(slug!, thread.slug)),
      });
    });

    workspaces.forEach((workspace: any) => {
      items.push({
        id: `workspace-${workspace.slug}`,
        group: "workspaces",
        label: workspace.name,
        description: t("commandHub.actions.openWorkspace"),
        icon: <SquaresFour size={17} />,
        keywords: ["workspace", workspace.slug],
        perform: () => navigate(paths.workspace.chat(workspace.slug)),
      });
    });

    return items;
  }, [createChat, navigate, slug, t, threads, user?.role, workspaces]);

  useEffect(() => {
    const handleCommandShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "n" &&
        !commandOpen
      ) {
        event.preventDefault();
        void createChat();
      }
    };
    window.addEventListener("keydown", handleCommandShortcut);
    return () => window.removeEventListener("keydown", handleCommandShortcut);
  }, [commandOpen, createChat]);

  // ⌘I shortcut: navigate to current workspace or home via React Router.
  useEffect(() => {
    const handleNavigateHome = () => {
      if (slug) {
        navigate(paths.workspace.chat(slug));
      } else {
        navigate(paths.home());
      }
    };
    window.addEventListener(NAVIGATE_HOME_EVENT, handleNavigateHome);
    return () =>
      window.removeEventListener(NAVIGATE_HOME_EVENT, handleNavigateHome);
  }, [navigate, slug]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-primary light:bg-[#f9fafb] flex">
      {!isMobile && <LeftSidebarIconBar />}
      <Suspense
        fallback={
          isMobile ? (
            <div className="fixed inset-x-0 top-0 z-40 h-14" aria-hidden />
          ) : (
            <div
              className="hidden h-full w-[260px] shrink-0 border-r border-white/[0.06] md:block"
              aria-hidden
            />
          )
        }
      >
        {!isMobile ? (
          <Sidebar onOpenSearch={() => setCommandOpen(true)} />
        ) : (
          <SidebarMobileHeader onOpenSearch={() => setCommandOpen(true)} />
        )}
      </Suspense>
      <div
        className={`min-w-0 flex-1 transition-[margin] duration-150 ease-out ${isMobile ? "pt-14" : ""} ${railVisible ? "md:ml-[52px]" : ""}`}
      >
        <ShowWorkspaceChat />
      </div>
      {commandOpen ? (
        <Suspense fallback={null}>
          <CommandPalette
            open={commandOpen}
            onOpenChange={setCommandOpen}
            items={commandItems}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

function ShowWorkspaceChat() {
  const { slug, threadSlug } = useParams<{
    slug: string;
    threadSlug?: string;
  }>();
  const {
    workspace: rawWorkspaceValue,
    suggestedMessages,
    showAgentCommand,
    isLoading,
  } = useWorkspaceChats(slug ?? "");
  const rawWorkspace = rawWorkspaceValue as {
    slug: string;
    name: string;
    [key: string]: unknown;
  } | null;
  const [workspace, setWorkspace] = useState<any>(null);
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const suggestedMessagesRef = useRef(suggestedMessages);
  const showAgentCommandRef = useRef(showAgentCommand);

  useEffect(() => {
    suggestedMessagesRef.current = suggestedMessages;
    showAgentCommandRef.current = showAgentCommand;
  }, [suggestedMessages, showAgentCommand]);

  useEffect(() => {
    if (isLoading) return;
    if (!slug) return;
    if (!rawWorkspace) {
      setWorkspace(null);
      setLoadedSlug(slug);
      setNotFound(true);
      return;
    }

    setNotFound(false);
    setWorkspace({
      ...rawWorkspace,
      suggestedMessages: suggestedMessagesRef.current,
      showAgentCommand: showAgentCommandRef.current,
    });
    setLoadedSlug(slug);
    safeSetItem(
      LAST_VISITED_WORKSPACE,
      JSON.stringify({
        slug: rawWorkspace.slug,
        name: rawWorkspace.name,
      }),
    );
  }, [slug, isLoading, rawWorkspace]);

  if (notFound && !isLoading) {
    return <Navigate to="/" replace />;
  }

  return (
    <WorkspaceChatContainer
      loading={loadedSlug !== slug}
      workspace={workspace}
      threadSlug={threadSlug}
    />
  );
}
