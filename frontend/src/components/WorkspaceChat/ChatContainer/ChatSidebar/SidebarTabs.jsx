import { BookOpen, FileText, FolderOpen } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useChatSidebar, useMemoriesSidebar, useSourcesSidebar } from ".";
import { useMemoriesContext, LIMITS } from "../MemoriesSidebar/MemoriesContext";

export default function SidebarTabs() {
  const { t } = useTranslation();
  const { activeSidebar, sidebarData, openSidebar, closeSidebar, toggleSidebar } = useChatSidebar();
  const { activeTab: memoriesActiveTab, setActiveTab: setMemoriesActiveTab, memories } = useMemoriesContext();
  const workspaceName = t("chat_window.memories.tab_workspace");
  const workspaceCount = memories.workspace.length;
  const globalCount = memories.global.length;

  const isSourcesActive = activeSidebar === "sources";
  const isMemoriesActive = activeSidebar === "memories";

  return (
    <div className="flex items-center justify-between shrink-0 gap-2 mb-3">
      <div className="flex items-center gap-1 min-w-0">
        {/* Quellen Tab */}
        <button
          type="button"
          onClick={() => {
            closeSidebar();
            openSidebar("sources", sidebarData);
          }}
          className={`flex items-center gap-1.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium uppercase tracking-[1.2px] whitespace-nowrap transition-colors ${
            activeSidebar === "sources"
              ? "bg-zinc-800 light:bg-slate-300 text-white light:text-slate-900"
              : "bg-transparent hover:bg-zinc-800/50 light:hover:bg-slate-200 text-zinc-300 light:text-slate-700"
          }`}
        >
          <FileText size={12} weight="bold" />
          <span className="text-zinc-200 light:text-slate-800 truncate max-w-[140px]">
            {t("chat_window.sources")}
          </span>
        </button>

        {/* Erinnerungen Tab (mit Sub-Tabs Workspace/Global) */}
        <div className={`flex items-center gap-1 ${isMemoriesActive ? "" : "opacity-50 pointer-events-none"}`}>
          <button
            type="button"
            onClick={() => {
              closeSidebar();
              toggleSidebar("memories");
            }}
            disabled={!isMemoriesActive}
            className={`flex items-center gap-1.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium uppercase tracking-[1.2px] whitespace-nowrap transition-colors ${
              isMemoriesActive && memoriesActiveTab === "workspace"
                ? "bg-zinc-800 light:bg-slate-300 text-white light:text-slate-900"
                : "bg-transparent hover:bg-zinc-800/50 light:hover:bg-slate-200 text-zinc-300 light:text-slate-700"
            }`}
            disabled={!isMemoriesActive}
          >
            <FolderOpen size={12} weight="bold" />
            <span className="text-zinc-200 light:text-slate-800 truncate max-w-[140px]">
              {t("chat_window.memories.tab_workspace")}
            </span>
            <span className="text-zinc-400 light:text-slate-600 font-normal">
              ({memories.workspace.length}/{LIMITS.workspace})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMemoriesActiveTab("global")}
            disabled={!isMemoriesActive}
            className={`flex items-center gap-0.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium uppercase tracking-[1.2px] whitespace-nowrap transition-colors shrink-0 ${
              isMemoriesActive && memoriesActiveTab === "global"
                ? "bg-zinc-800 light:bg-slate-300 text-white light:text-slate-900"
                : "bg-transparent hover:bg-zinc-800/50 light:hover:bg-slate-200 text-zinc-300 light:text-slate-700"
            }`}
            disabled={!isMemoriesActive}
          >
            <BookOpen size={12} weight="bold" />
            <span className="text-zinc-200 light:text-slate-800">
              {t("chat_window.memories.tab_global")}
            </span>
            <span className="text-zinc-400 light:text-slate-600 font-normal">
              ({memories.global.length}/{LIMITS.global})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
