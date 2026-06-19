// SPDX-License-Identifier: MIT
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "@/components/ErrorBoundaryFallback";
import SourcesSidebar from "./SourcesSidebar";
import MemoriesSidebar from "./MemoriesSidebar";
import PreviewSidebar from "./PreviewSidebar";
import ConsoleSidebar from "./ConsoleSidebar";
import FilesystemSidebar from "./FilesystemSidebar";
import DatabaseSidebar from "./DatabaseSidebar";
import PoliticalSidebar from "./PoliticalSidebar";
import RightSidebarIconBar from "./RightSidebarIconBar";
import { useChatSidebar } from "./ChatSidebar";
import { useTranslation } from "react-i18next";

const PANEL_W = 360; // px — default panel content width

/**
 * Renders the right sidebar: icon bar + active panel side by side.
 * The icon bar is always visible (44px rail).
 * When a panel is active, the full panel (360px) appears to the left of the icon rail.
 */
interface SidebarsProps {
  workspace: any;
}

export default function Sidebars({ workspace }: SidebarsProps) {
  const { t } = useTranslation();
  const { activeSidebar } = useChatSidebar();

  return (
    <div
      className="h-full flex flex-row flex-shrink-0 transition-all duration-500 overflow-hidden"
      aria-label={t("common.rightSidebar")}
    >
      {/* Panel area — only when a panel is active */}
      {activeSidebar && (
        <div
          style={{ "--panel-width": `${PANEL_W}px` } as React.CSSProperties}
          className="w-[var(--panel-width)] h-full flex-shrink-0 relative my-2 rounded-2xl overflow-hidden bg-zinc-900 light:bg-white shadow-lg"
        >
          {activeSidebar === "sources" && (
            <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
              <SourcesSidebar workspace={workspace} />
            </ErrorBoundary>
          )}
          {activeSidebar === "memories" && (
            <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
              <MemoriesSidebar workspace={workspace} />
            </ErrorBoundary>
          )}
          {activeSidebar === "preview" && <PreviewSidebar />}
          {activeSidebar === "console" && <ConsoleSidebar />}
          {activeSidebar === "filesystem" && (
            <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
              <FilesystemSidebar />
            </ErrorBoundary>
          )}
          {activeSidebar === "database" && <DatabaseSidebar />}
          {activeSidebar === "political" && <PoliticalSidebar />}
        </div>
      )}

      {/* Icon bar — always visible */}
      <RightSidebarIconBar />
    </div>
  );
}
