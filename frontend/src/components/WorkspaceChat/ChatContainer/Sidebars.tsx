// SPDX-License-Identifier: MIT
import { createPortal } from "react-dom";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "@/components/ErrorBoundaryFallback";
import SourcesSidebar from "./SourcesSidebar";
import PreviewSidebar from "./PreviewSidebar";
import ConsoleSidebar from "./ConsoleSidebar";
import DatabaseSidebar from "./DatabaseSidebar";
import PoliticalSidebar from "./PoliticalSidebar";
import PdfAnalysisSidebar from "./PdfAnalysisSidebar";
import NotepadSidebar from "./NotepadSidebar";
import AgentSessionsSidebar from "./AgentSessionsSidebar";
import AgentSettingsSidebar from "./AgentSettingsSidebar";
import WorkspaceSettingsSidebar from "./WorkspaceSettingsSidebar";
import RightSidebarIconBar from "./RightSidebarIconBar";
import { useChatSidebar } from "./ChatSidebar";
import { useTranslation } from "react-i18next";
import { X } from "@phosphor-icons/react/dist/csr/X";

function ActiveSidebarPanel({ workspace }: SidebarsProps) {
  const { activeSidebar } = useChatSidebar();
  if (!activeSidebar) return null;
  return (
    <div className="relative z-30 h-full min-w-0 flex-shrink-0 overflow-hidden border-l border-white/[0.08] bg-theme-bg-sidebar light:border-zinc-200/70 [&>*]:min-w-0 [&>*]:max-w-full">
      {activeSidebar === "sources" && (
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <SourcesSidebar workspace={workspace} />
        </ErrorBoundary>
      )}
      {activeSidebar === "preview" && (
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <PreviewSidebar />
        </ErrorBoundary>
      )}
      {activeSidebar === "console" && (
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <ConsoleSidebar />
        </ErrorBoundary>
      )}
      {activeSidebar === "database" && (
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <DatabaseSidebar workspace={workspace} />
        </ErrorBoundary>
      )}
      {activeSidebar === "political" && (
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <PoliticalSidebar />
        </ErrorBoundary>
      )}
      {activeSidebar === "pdf-analysis" && (
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <PdfAnalysisSidebar />
        </ErrorBoundary>
      )}
      {activeSidebar === "notepad" && (
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <NotepadSidebar workspace={workspace} />
        </ErrorBoundary>
      )}
      {activeSidebar === "agent-sessions" && (
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <AgentSessionsSidebar workspace={workspace} />
        </ErrorBoundary>
      )}
      {activeSidebar === "agent-settings" && (
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <AgentSettingsSidebar workspace={workspace} />
        </ErrorBoundary>
      )}
      {activeSidebar === "workspace-settings" && (
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <WorkspaceSettingsSidebar workspace={workspace} />
        </ErrorBoundary>
      )}
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
 * The icon bar is always visible (44px rail).
 * When a panel is active, the full panel appears to the left of the icon rail.
 * The panel width is controlled by ChatSidebar's internal width state (persisted
 * to localStorage) — the outer wrapper here has no fixed width so it wraps to
 * the ChatSidebar's dynamic width.
 *
 * Uses a React portal to render outside the clipped <main> container.
 */
interface SidebarsProps {
  workspace: any;
}

function SidebarsContent({ workspace }: SidebarsProps) {
  const { t } = useTranslation();
  const { activeSidebar } = useChatSidebar();

  return (
    <div
      className={`fixed z-40 min-w-0 shrink-0 flex-row overflow-hidden md:right-0 md:top-0 md:h-full md:flex ${activeSidebar ? "inset-0 flex h-full w-full bg-[var(--chat-canvas)] md:inset-auto md:h-full md:w-auto md:bg-transparent" : "hidden"}`}
      aria-label={t("common.rightSidebar")}
    >
      <ActiveSidebarPanel workspace={workspace} />

      {/* Icon bar — always visible */}
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
