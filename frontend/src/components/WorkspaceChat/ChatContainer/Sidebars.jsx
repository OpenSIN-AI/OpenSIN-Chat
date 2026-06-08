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

/**
 * Renders all sidebar components and the right icon bar.
 * The entire right section can be toggled open/closed via the collapse icon,
 * exactly like the left sidebar toggle. Accepts: workspace
 */
export default function Sidebars({ workspace }) {
  const { rightSidebarOpen } = useChatSidebar();

  return (
    <div
      className={`h-full border-l border-theme-sidebar-border transition-all duration-500 overflow-hidden flex-shrink-0 ${
        rightSidebarOpen
          ? "w-[48px] bg-theme-bg-primary"
          : "w-0 bg-transparent border-l-0"
      }`}
    >
      <SourcesSidebar workspace={workspace} />
      <MemoriesSidebar workspace={workspace} />
      <PreviewSidebar />
      <ConsoleSidebar />
      <FilesystemSidebar />
      <DatabaseSidebar />
      <PoliticalSidebar />
      <RightSidebarIconBar />
    </div>
  );
}
