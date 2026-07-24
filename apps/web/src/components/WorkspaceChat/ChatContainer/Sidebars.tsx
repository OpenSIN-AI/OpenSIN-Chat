// SPDX-License-Identifier: MIT
// Purpose: Right-rail sidebars host — panels are code-split so TipTap/PDF/etc.
// stay off the critical chat first-load path (PERF CEO).
import { createPortal } from "react-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "@/components/ErrorBoundaryFallback";
import RightSidebarIconBar from "./RightSidebarIconBar";
import MobileSidebarMenu from "./MobileSidebarMenu";
import { useChatSidebar } from "./ChatSidebar";
import { useTranslation } from "react-i18next";

// Lazy panels: only the open sidebar is downloaded. Notepad (TipTap), PDF,
// Database, etc. must not land in the initial WorkspaceChat graph.
const SourcesSidebar = lazy(() => import("./SourcesSidebar"));
const PreviewSidebar = lazy(() => import("./PreviewSidebar"));
const ConsoleSidebar = lazy(() => import("./ConsoleSidebar"));
const DatabaseSidebar = lazy(() => import("./DatabaseSidebar"));
const PoliticalSidebar = lazy(() => import("./PoliticalSidebar"));
const PdfAnalysisSidebar = lazy(() => import("./PdfAnalysisSidebar"));
const NotepadSidebar = lazy(() => import("./NotepadSidebar"));
const AgentSessionsSidebar = lazy(() => import("./AgentSessionsSidebar"));
const AgentSettingsSidebar = lazy(() => import("./AgentSettingsSidebar"));
const WorkspaceSettingsSidebar = lazy(
  () => import("./WorkspaceSettingsSidebar"),
);
const ResultsSidebar = lazy(() => import("./ResultsSidebar"));

function PanelFallback() {
  return (
    <div
      className="flex h-full w-full min-w-0 items-center justify-center text-xs text-theme-text-secondary md:w-[min(360px,100vw)]"
      aria-busy="true"
    >
      …
    </div>
  );
}

function ActiveSidebarPanel({
  workspace,
  sidebarType,
}: SidebarsProps & { sidebarType: string | null }) {
  if (!sidebarType) return null;

  let panel: React.ReactNode;
  switch (sidebarType) {
    case "sources":
      panel = <SourcesSidebar workspace={workspace} />;
      break;
    case "preview":
      panel = <PreviewSidebar />;
      break;
    case "console":
      panel = <ConsoleSidebar />;
      break;
    case "database":
      panel = <DatabaseSidebar workspace={workspace} />;
      break;
    case "political":
      panel = <PoliticalSidebar />;
      break;
    case "pdf-analysis":
      panel = <PdfAnalysisSidebar />;
      break;
    case "notepad":
      panel = <NotepadSidebar workspace={workspace} />;
      break;
    case "agent-sessions":
      panel = <AgentSessionsSidebar workspace={workspace} />;
      break;
    case "agent-settings":
      panel = <AgentSettingsSidebar workspace={workspace} />;
      break;
    case "workspace-settings":
      panel = <WorkspaceSettingsSidebar workspace={workspace} />;
      break;
    case "results":
      panel = <ResultsSidebar workspace={workspace} />;
      break;
    default:
      panel = null;
  }

  if (!panel) return null;

  return (
    <div
      className="relative z-30 flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden border-l border-white/[0.08] bg-theme-bg-sidebar light:border-zinc-200/70 md:w-auto md:max-w-none md:flex-none [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:max-w-full [&>*]:flex-1"
      data-sidebar-panel={sidebarType || undefined}
    >
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <Suspense fallback={<PanelFallback />}>{panel}</Suspense>
      </ErrorBoundary>
    </div>
  );
}

/**
 * Renders the right sidebar: desktop icon bar + active panel.
 * On mobile/tablet (`md` and below) the icon bar is hidden — tools open via
 * MobileSidebarMenu (bottom FAB + sheet / in-panel dock). Close is handled
 * by that dock so we no longer need a separate top-right X that collided
 * with the left-nav chrome.
 */
interface SidebarsProps {
  workspace: any;
}

function SidebarsContent({ workspace }: SidebarsProps) {
  const { t } = useTranslation();
  const { activeSidebar } = useChatSidebar();
  const [renderedSidebar, setRenderedSidebar] = useState<string | null>(
    activeSidebar,
  );

  useEffect(() => {
    if (activeSidebar) {
      setRenderedSidebar(activeSidebar);
    } else {
      // Clear after close animation finishes so the panel fully unmounts
      const timer = setTimeout(() => setRenderedSidebar(null), 250);
      return () => clearTimeout(timer);
    }
  }, [activeSidebar]);

  return (
    <div
      className={`fixed z-40 min-h-0 min-w-0 shrink-0 flex-row items-stretch overflow-hidden md:right-0 md:top-0 md:h-full md:flex ${
        activeSidebar
          ? // Mobile/tablet: true fullscreen shell so panels get a definite width/height
            // (flex % width on auto-sized parents collapses to blank canvas).
            "inset-0 flex h-[100dvh] w-full max-w-full bg-theme-bg-sidebar pb-[calc(56px+env(safe-area-inset-bottom,0px))] md:inset-auto md:h-full md:w-auto md:max-w-none md:bg-transparent md:pb-0"
          : "hidden md:flex"
      }`}
      aria-label={t("common.rightSidebar")}
    >
      <ActiveSidebarPanel workspace={workspace} sidebarType={renderedSidebar} />

      <RightSidebarIconBar />
    </div>
  );
}

export default function Sidebars({ workspace }: SidebarsProps) {
  return createPortal(
    <>
      <SidebarsContent workspace={workspace} />
      {/* Single mobile entry point for right-rail tools (Home + Workspace). */}
      <MobileSidebarMenu />
    </>,
    document.body,
  );
}
