// SPDX-License-Identifier: MIT
// Purpose: Horizontal tab strip that switches the right sidebar between
// the Quellen / Arbeitsbereich / Global modes. Uses flex-wrap so the
// pills never overflow the 360px panel and get hidden behind the icon
// bar.
// Docs: SidebarTabs.doc.md
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { useTranslation } from "react-i18next";
import { useChatSidebar } from ".";
import { useMemoriesContext, LIMITS } from "../MemoriesSidebar/MemoriesContext";

/**
 * Tab strip rendered at the top of the right-sidebar panels.
 *
 * Layout contract:
 *   The strip contains three pills: "Quellen" (sources), "Arbeitsbereich"
 *   (workspace memories) and "Global" (global memories). The pills are
 *   rendered in a flex row that WRAPS to a second line when the panel is
 *   too narrow (default panel = 360px). Without `flex-wrap` the pills
 *   overflowed the panel and spilled under the 44px icon column, which
 *   made "Global" (the rightmost pill) unclickable: clicks at the
 *   pill's centre were absorbed by the icon bar's "Vorschau" button.
 *
 * Behaviour contract:
 *   - "Quellen" → opens the Sources sidebar, passing through the last
 *     sources payload (sidebarData) so we don't lose the existing
 *     citation list when the user toggles away and back.
 *   - "Arbeitsbereich" / "Global" → always set the memories sub-tab.
 *     If the Memories sidebar is not active (e.g. we are inside the
 *     Sources sidebar, which also renders this strip), the click also
 *     switches activeSidebar to "memories" so the user sees the
 *     requested sub-tab. From the user's perspective every click on
 *     the strip produces a visible result, which is what they
 *     reported as missing before the layout fix.
 */
export default function SidebarTabs() {
  const { t } = useTranslation();
  const { activeSidebar, openSidebar, sidebarData } = useChatSidebar();
  const {
    activeTab: memoriesActiveTab,
    setActiveTab: setMemoriesActiveTab,
    memories,
  } = useMemoriesContext();

  const isMemoriesActive = activeSidebar === "memories";

  function selectMemoriesTab(tab) {
    if (!isMemoriesActive) {
      // We're in another sidebar (e.g. Sources) — switch to Memories
      // first so the user sees the requested sub-tab.
      openSidebar("memories", null);
    }
    setMemoriesActiveTab(tab);
  }

  return (
    <div className="flex items-center justify-between shrink-0 gap-2 mb-3 w-full">
      <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
        {/* Sources tab */}
        <button
          type="button"
          onClick={() => openSidebar("sources", sidebarData)}
          aria-pressed={activeSidebar === "sources"}
          aria-label={t("chat_window.memories.tab_sources")}
          className={`flex items-center gap-1.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium uppercase tracking-[1.2px] whitespace-nowrap transition-colors min-w-0 ${
            activeSidebar === "sources"
              ? "bg-zinc-800 light:bg-slate-300 text-theme-text-primary light:text-theme-text-primary"
              : "bg-transparent hover:bg-zinc-800/50 light:hover:bg-slate-200 text-zinc-300 light:text-slate-700"
          }`}
        >
          <FileText size={12} weight="bold" />
          <span className="text-zinc-200 light:text-slate-800 truncate">
            {t("chat_window.memories.tab_sources")}
          </span>
        </button>

        {/* Arbeitsbereich sub-tab */}
        <button
          type="button"
          onClick={() => selectMemoriesTab("workspace")}
          aria-pressed={isMemoriesActive && memoriesActiveTab === "workspace"}
          aria-label={t("chat_window.memories.tab_workspace")}
          className={`flex items-center gap-1.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium uppercase tracking-[1.2px] whitespace-nowrap transition-colors min-w-0 ${
            isMemoriesActive && memoriesActiveTab === "workspace"
              ? "bg-zinc-800 light:bg-slate-300 text-theme-text-primary light:text-theme-text-primary"
              : "bg-transparent hover:bg-zinc-800/50 light:hover:bg-slate-200 text-zinc-300 light:text-slate-700"
          }`}
        >
          <FolderOpen size={12} weight="bold" />
          <span className="text-zinc-200 light:text-slate-800 truncate">
            {t("chat_window.memories.tab_workspace")}
          </span>
          <span className="text-zinc-400 light:text-slate-600 font-normal">
            {t("chat_window.memories.count", {
              current: memories.workspace.length,
              max: LIMITS.workspace,
            })}
          </span>
        </button>

        {/* Global sub-tab */}
        <button
          type="button"
          onClick={() => selectMemoriesTab("global")}
          aria-pressed={isMemoriesActive && memoriesActiveTab === "global"}
          aria-label={t("chat_window.memories.tab_global")}
          className={`flex items-center gap-0.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium uppercase tracking-[1.2px] whitespace-nowrap transition-colors min-w-0 ${
            isMemoriesActive && memoriesActiveTab === "global"
              ? "bg-zinc-800 light:bg-slate-300 text-theme-text-primary light:text-theme-text-primary"
              : "bg-transparent hover:bg-zinc-800/50 light:hover:bg-slate-200 text-zinc-300 light:text-slate-700"
          }`}
        >
          <BookOpen size={12} weight="bold" />
          <span className="text-zinc-200 light:text-slate-800 truncate">
            {t("chat_window.memories.tab_global")}
          </span>
          <span className="text-zinc-400 light:text-slate-600 font-normal">
            {t("chat_window.memories.count", {
              current: memories.global.length,
              max: LIMITS.global,
            })}
          </span>
        </button>
      </div>
    </div>
  );
}
