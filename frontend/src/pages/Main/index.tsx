// SPDX-License-Identifier: MIT
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import Home from "./Home";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import LeftSidebarIconBar from "@/components/WorkspaceChat/ChatContainer/LeftSidebarIconBar";
import { SidebarToggleProvider } from "@/components/Sidebar/SidebarToggle";
import useWorkspaces from "@/hooks/useWorkspaces";
import useUser from "@/hooks/useUser";
import paths from "@/utils/paths";
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import { SquaresFour } from "@phosphor-icons/react/dist/csr/SquaresFour";
import { GearSix } from "@phosphor-icons/react/dist/csr/GearSix";
import { CalendarBlank } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { Wrench } from "@phosphor-icons/react/dist/csr/Wrench";
import type { CommandItem } from "@/components/Workspace/CommandPalette/CommandPalette";

// PERF (CEO): left workspace rail (threads/footer) off the auth→home critical path.
// Icon bar stays sync so layout chrome is instant.
const Sidebar = lazy(() => import("@/components/Sidebar"));
const SidebarMobileHeader = lazy(() =>
  import("@/components/Sidebar").then((m) => ({
    default: m.SidebarMobileHeader,
  })),
);

// PERF (CEO): CommandPalette only needed on ⌘K / search — keep off first paint.
const CommandPalette = lazy(() =>
  import("@/components/Workspace/CommandPalette/CommandPalette").then((m) => ({
    default: m.CommandPalette,
  })),
);

export default function Main() {
  const { t } = useTranslation();
  const { loading, requiresAuth, mode, apiError } = usePasswordModal();

  if (loading) return <FullScreenLoader />;
  if (apiError)
    return (
      <div className="fixed inset-0 bg-theme-bg-primary light:bg-[#f9fafb] flex flex-col items-center justify-center overflow-hidden p-6">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-xl font-semibold mb-2">
            {t("error.serverUnavailable")}
          </p>
          <p className="text-zinc-400 text-sm">
            {t("error.serverUnavailableDescription")}
          </p>
        </div>
      </div>
    );
  if (requiresAuth !== false)
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;

  return (
    <SidebarToggleProvider>
      <MainLayout />
    </SidebarToggleProvider>
  );
}

function MainLayout() {
  const { t } = useTranslation();
  const isMobile = useIsMobileLayout();
  const navigate = useNavigate();
  const { user } = useUser();
  const { workspaces } = useWorkspaces();
  const [commandOpen, setCommandOpen] = useState(false);

  // Warm the workspace chat chunk while the user is on Home so the first
  // navigation into a thread is instant (cache hit, no waterfall).
  useEffect(() => {
    const idle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 1200);
    const cancel =
      typeof cancelIdleCallback === "function"
        ? cancelIdleCallback
        : (id: number) => clearTimeout(id);
    const id = idle(() => {
      void import("@/pages/WorkspaceChat");
      void import("@/components/WorkspaceChat");
    });
    return () => cancel(id as number);
  }, []);

  const commandItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
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

    if (user?.role !== "default") {
      items.push({
        id: "agent-skills",
        group: "navigation",
        label: t("commandHub.actions.agentSkills", "Agent-Fähigkeiten"),
        description: t(
          "commandHub.actions.agentSkillsDescription",
          "Agent-Fähigkeiten und Werkzeuge verwalten",
        ),
        icon: <Wrench size={17} />,
        keywords: ["agent", "skills", "tools"],
        perform: () => navigate(paths.settings.agentSkills()),
      });
      items.push({
        id: "scheduled",
        group: "navigation",
        label: t("commandHub.actions.scheduled"),
        description: t("commandHub.actions.scheduledDescription"),
        icon: <CalendarBlank size={17} />,
        keywords: ["jobs", "tasks", "schedule"],
        perform: () => navigate(paths.settings.scheduledJobs()),
      });
    }

    (workspaces as any[]).forEach((workspace: any) => {
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
  }, [t, navigate, user, workspaces]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-theme-bg-primary">
      {!isMobile ? <LeftSidebarIconBar /> : null}
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
        className={`flex-1 min-w-0 overflow-hidden${isMobile ? " pt-14" : ""}`}
      >
        <Home />
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
