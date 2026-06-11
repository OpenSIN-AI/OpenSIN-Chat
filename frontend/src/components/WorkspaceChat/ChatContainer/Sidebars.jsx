import SourcesSidebar from "./SourcesSidebar";
import MemoriesSidebar from "./MemoriesSidebar";
import PreviewSidebar from "./PreviewSidebar";
import ConsoleSidebar from "./ConsoleSidebar";
import FilesystemSidebar from "./FilesystemSidebar";
import DatabaseSidebar from "./DatabaseSidebar";
import PoliticalSidebar from "./PoliticalSidebar";
import RightSidebarIconBar, {
  RightSidebarToggleButton,
} from "./RightSidebarIconBar";
import { useChatSidebar } from "./ChatSidebar";

const PANEL_W = 360; // px — default panel content width

/**
 * Renders the right sidebar: icon bar + active panel side by side.
 * The toggle button is always visible (44px column).
 * When open, the icon rail shows all panel icons.
 * When a panel is active, the full panel (360px) appears to the left of the icon rail.
 */
export default function Sidebars({ workspace }) {
  const { rightSidebarOpen, activeSidebar } = useChatSidebar();

  return (
    <div
      className="h-full flex flex-row flex-shrink-0 transition-all duration-500 overflow-hidden border-l border-theme-sidebar-border"
      aria-label="Rechte Seitenleiste"
    >
      {/* Panel area — only when sidebar open AND a panel is active */}
      {rightSidebarOpen && activeSidebar && (
        <div
          style={{ width: PANEL_W }}
          className="h-full overflow-hidden flex-shrink-0 relative bg-zinc-900 light:bg-white"
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

      {/* Icon bar — always visible (contains toggle + panel icons when open) */}
      {rightSidebarOpen ? (
        <RightSidebarIconBar />
      ) : (
        // Collapsed: just the toggle button in a 44px column
        <div className="flex flex-col items-center py-2 px-1 bg-zinc-900 light:bg-white h-full w-[44px] flex-shrink-0">
          <RightSidebarToggleButton />
        </div>
      )}
    </div>
  );
}
