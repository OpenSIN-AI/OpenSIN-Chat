import SourcesSidebar from "./SourcesSidebar";
import MemoriesSidebar from "./MemoriesSidebar";
import PreviewSidebar from "./PreviewSidebar";
import ConsoleSidebar from "./ConsoleSidebar";
import FilesystemSidebar from "./FilesystemSidebar";
import DatabaseSidebar from "./DatabaseSidebar";
import PoliticalSidebar from "./PoliticalSidebar";
import RightSidebarIconBar from "./RightSidebarIconBar";
import { useChatSidebar } from "./ChatSidebar";

const PANEL_W = 360; // px — default panel content width

/**
 * Renders the right sidebar: icon bar + active panel side by side.
 * The icon bar is always visible (44px rail).
 * When a panel is active, the full panel (360px) appears to the left of the icon rail.
 */
export default function Sidebars({ workspace }) {
  const { activeSidebar } = useChatSidebar();

  return (
    <div
      className="h-full flex flex-row flex-shrink-0 transition-all duration-500 overflow-hidden border-l border-theme-sidebar-border"
      aria-label="Rechte Seitenleiste"
    >
      {/* Panel area — only when a panel is active */}
      {activeSidebar && (
        <div
          style={{ "--panel-width": `${PANEL_W}px` }}
          className="w-[var(--panel-width)] h-full overflow-hidden flex-shrink-0 relative bg-zinc-900 light:bg-white"
        >
          {activeSidebar === "sources" && (
            <SourcesSidebar workspace={workspace} />
          )}
          {activeSidebar === "memories" && (
            <MemoriesSidebar workspace={workspace} />
          )}
          {activeSidebar === "preview" && <PreviewSidebar />}
          {activeSidebar === "console" && <ConsoleSidebar />}
          {activeSidebar === "filesystem" && <FilesystemSidebar />}
          {activeSidebar === "database" && <DatabaseSidebar />}
          {activeSidebar === "political" && <PoliticalSidebar />}
        </div>
      )}

      {/* Icon bar — always visible */}
      <RightSidebarIconBar />
    </div>
  );
}
