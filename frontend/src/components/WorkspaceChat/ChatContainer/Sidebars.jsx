// SPDX-License-Identifier: MIT
import SourcesSidebar from "./SourcesSidebar";
import MemoriesSidebar from "./MemoriesSidebar";
import PreviewSidebar from "./PreviewSidebar";
import ConsoleSidebar from "./ConsoleSidebar";
import FilesystemSidebar from "./FilesystemSidebar";
import DatabaseSidebar from "./DatabaseSidebar";
import PoliticalSidebar from "./PoliticalSidebar";
import RightSidebarIconBar from "./RightSidebarIconBar";
import { useChatSidebar } from "./ChatSidebar";

const ICON_BAR_W = 44; // px — width of the icon rail
const PANEL_W = 360;   // px — default panel content width

/**
 * Renders the right sidebar: icon bar + active panel side by side.
 * Clicking the toggle button shows the icon rail (44 px).
 * Clicking an icon in the rail opens the full panel (360 px) to its left —
 * the whole right section behaves like the left sidebar.
 */
export default function Sidebars({ workspace }) {
  const { rightSidebarOpen, activeSidebar } = useChatSidebar();

  // Total width: icon bar only, or icon bar + panel
  const totalWidth = rightSidebarOpen
    ? activeSidebar
      ? ICON_BAR_W + PANEL_W
      : ICON_BAR_W
    : 0;

  return (
    <div
      style={{ width: totalWidth }}
      className="h-full flex flex-row flex-shrink-0 transition-all duration-500 overflow-hidden border-l border-theme-sidebar-border"
      aria-hidden={!rightSidebarOpen}
    >
      {rightSidebarOpen && (
        <>
          {/* Panel area — fills the space to the left of the icon bar */}
          <div
            style={{ width: activeSidebar ? PANEL_W : 0 }}
            className="h-full overflow-hidden transition-all duration-500 flex-shrink-0 relative bg-zinc-900 light:bg-white"
          >
            <SourcesSidebar workspace={workspace} />
            <MemoriesSidebar workspace={workspace} />
            <PreviewSidebar />
            <ConsoleSidebar />
            <FilesystemSidebar />
            <DatabaseSidebar />
            <PoliticalSidebar />
          </div>

          {/* Icon bar — always visible while sidebar is open */}
          <RightSidebarIconBar />
        </>
      )}
    </div>
  );
}
