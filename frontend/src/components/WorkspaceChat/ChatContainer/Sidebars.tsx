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
      className="fixed right-0 top-0 z-40 hidden h-full min-w-0 shrink-0 flex-row overflow-hidden md:flex"
      aria-label={t("common.rightSidebar")}
    >
      {/* Panel area — only when a panel is active */}
      {activeSidebar && (
        <div className="relative z-30 h-full min-w-0 flex-shrink-0 overflow-hidden border-l border-theme-modal-border bg-theme-bg-sidebar md:max-w-none">
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
      )}

      {/* Icon bar — always visible */}
      <RightSidebarIconBar />
    </div>
  );
}

export default function Sidebars({ workspace }: SidebarsProps) {
  return createPortal(
    <SidebarsContent workspace={workspace} />,
    document.body
  );
}
