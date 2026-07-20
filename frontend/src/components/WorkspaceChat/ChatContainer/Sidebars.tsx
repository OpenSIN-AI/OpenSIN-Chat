// SPDX-License-Identifier: MIT
// Purpose: Right-rail sidebars host — panels are code-split so TipTap/PDF/etc.
// stay off the critical chat first-load path (PERF CEO).
import { createPortal } from "react-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "@/components/ErrorBoundaryFallback";
import RightSidebarIconBar from "./RightSidebarIconBar";
import { useChatSidebar } from "./ChatSidebar";
import { useTranslation } from "react-i18next";
import { X } from "@phosphor-icons/react/dist/csr/X";

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

function PanelFallback() {
  return (
    <div
      className="flex h-full w-[min(360px,100vw)] items-center justify-center text-xs text-theme-text-secondary"
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

  let panel: React.ReactNode = null;
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
    default:
      panel = null;
  }

  if (!panel) return null;

  return (
    <div className="relative z-30 h-full min-w-0 flex-shrink-0 overflow-hidden border-l border-white/[0.08] bg-theme-bg-sidebar light:border-zinc-200/70 [&>*]:min-w-0 [&>*]:max-w-full">
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <Suspense fallback={<PanelFallback />}>{panel}</Suspense>
      </ErrorBoundary>
    </div>
  );
}

function MobileSidebarCloseButton() {
  const { activeSidebar, closeSidebar } = useChatSidebar();
  const { t } = useTranslation();
  if (!activeSidebar) return null;

  return (
    <button
      type="button"
      onClick={closeSidebar}
      aria-label={t("common.closePanel", "Panel schließen")}
      className="fixed right-3 top-3 z-[120] flex h-11 w-11 items-center justify-center rounded-lg border border-theme-border bg-theme-bg-sidebar/95 text-theme-text-secondary shadow-lg backdrop-blur-sm transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary md:hidden"
    >
      <X size={18} />
    </button>
  );
}

/**
 * Renders the right sidebar: icon bar + active panel side by side.
 * Icon bar is always visible; panel code is lazy-loaded per type.
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
    if (activeSidebar) setRenderedSidebar(activeSidebar);
  }, [activeSidebar]);

  return (
    <div
      className={`fixed z-40 min-w-0 shrink-0 flex-row overflow-hidden md:right-0 md:top-0 md:h-full md:flex ${activeSidebar ? "inset-0 flex h-full w-full bg-[var(--chat-canvas)] md:inset-auto md:h-full md:w-auto md:bg-transparent" : "hidden md:flex"}`}
      aria-label={t("common.rightSidebar")}
    >
      <ActiveSidebarPanel
        workspace={workspace}
        sidebarType={renderedSidebar}
      />

      <RightSidebarIconBar />
    </div>
  );
}

export default function Sidebars({ workspace }: SidebarsProps) {
  return createPortal(
    <>
      <SidebarsContent workspace={workspace} />
      <MobileSidebarCloseButton />
    </>,
    document.body,
  );
}
