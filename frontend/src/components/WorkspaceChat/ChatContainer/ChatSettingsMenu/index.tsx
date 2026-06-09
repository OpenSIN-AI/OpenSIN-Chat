// SPDX-License-Identifier: MIT
import { useState, useRef, useEffect } from "react";
import {
  SlidersHorizontal,
  Eye,
  FolderOpen,
  Database,
  Newspaper,
  BookOpen,
  Terminal,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import useLoginMode from "@/hooks/useLoginMode";
import { useChatSidebar } from "../ChatSidebar";
import MemoriesRow from "./Memories";
import SourcesRow from "./Sources";

export default function ChatSettingsMenu() {
  return null;
  const mode = useLoginMode();
  const { t } = useTranslation();
  const { activeSidebar, toggleSidebar } = useChatSidebar();
  const [showMenu, setShowMenu] = useState(false as any);
  const menuRef: any = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleClickOutside(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const hasUserIcon = mode !== null;

  const sidebarShortcuts = [
    {
      id: "preview",
      icon: Eye,
      label: t("right_sidebar.icon_preview", "Vorschau"),
    },
    {
      id: "filesystem",
      icon: FolderOpen,
      label: t("right_sidebar.icon_filesystem", "Verzeichnis"),
    },
    {
      id: "database",
      icon: Database,
      label: t("right_sidebar.icon_database", "Politiker-Datenbank"),
    },
    {
      id: "political",
      icon: Newspaper,
      label: t("right_sidebar.icon_political", "Politisches"),
    },
    {
      id: "console",
      icon: Terminal,
      label: t("right_sidebar.icon_console", "Konsole & Terminal"),
    },
  ];

  return (
    <div
      className={`absolute top-3 md:top-5 z-30 ${hasUserIcon ? "right-[55px] md:right-[67px]" : "right-4 md:right-6"}`}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className={`group border-none cursor-pointer flex items-center justify-center w-[35px] h-[35px] rounded-full transition-all ${
          showMenu
            ? "bg-zinc-700 light:bg-slate-200"
            : "hover:bg-zinc-700 light:hover:bg-slate-200"
        }`}
      >
        <SlidersHorizontal
          size={18}
          className={
            showMenu
              ? "text-white light:text-slate-800"
              : "text-zinc-300 light:text-slate-600 group-hover:text-white light:group-hover:text-slate-800"
          }
        />
      </button>

      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-0 top-[42px] bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-300 rounded-lg p-3.5 w-[226px] flex flex-col gap-1.5 shadow-lg"
        >
          <div className="flex flex-col gap-0.5">
            {sidebarShortcuts.map(({ id, icon: Icon, label }) => {
              const isActive = activeSidebar === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    toggleSidebar(id);
                    setShowMenu(false);
                  }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                    isActive
                      ? "bg-zinc-700 light:bg-slate-200 text-white light:text-slate-900"
                      : "text-zinc-300 light:text-slate-700 hover:bg-zinc-700 light:hover:bg-slate-200 hover:text-white light:hover:text-slate-900"
                  }`}
                >
                  <Icon size={16} weight={isActive ? "fill" : "regular"} />
                  <span className="text-sm font-normal">{label}</span>
                </button>
              );
            })}
          </div>
          <div className="h-px bg-zinc-700 light:bg-slate-300 my-1" />
          <SourcesRow onClose={() => setShowMenu(false)} />
          <MemoriesRow onClose={() => setShowMenu(false)} />
        </div>
      )}
    </div>
  );
}
