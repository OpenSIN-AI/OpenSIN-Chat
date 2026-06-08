// SPDX-License-Identifier: MIT
import SourcesSidebar from "./SourcesSidebar";
import MemoriesSidebar from "./MemoriesSidebar";
import PreviewSidebar from "./PreviewSidebar";
import ConsoleSidebar from "./ConsoleSidebar";
import FilesystemSidebar from "./FilesystemSidebar";
import DatabaseSidebar from "./DatabaseSidebar";
import PoliticalSidebar from "./PoliticalSidebar";
import RightSidebarIconBar from "./RightSidebarIconBar";

/**
 * Renders all 6 sidebar components and the right icon bar.
 * Accepts: workspace
 */
export default function Sidebars({ workspace }) {
  return (
    <>
      <SourcesSidebar workspace={workspace} />
      <MemoriesSidebar workspace={workspace} />
      <PreviewSidebar />
      <ConsoleSidebar />
      <FilesystemSidebar />
      <DatabaseSidebar />
      <PoliticalSidebar />
      <RightSidebarIconBar />
    </>
  );
}
