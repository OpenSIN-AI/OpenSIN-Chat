// SPDX-License-Identifier: MIT
import { X, FolderOpen, Folder, FileText, HardDrive } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import ChatSidebar from "../ChatSidebar";
import { useFilesystemSidebar } from "../ChatSidebar";

export default function FilesystemSidebar() {
  const { sidebarOpen, closeSidebar } = useFilesystemSidebar();
  const { t } = useTranslation();

  const rootInfo = [
    { icon: HardDrive, label: "Plattform", value: navigator?.platform || "Unbekannt" },
    { icon: Folder, label: "Arbeitsverzeichnis", value: "/app" },
    { icon: FolderOpen, label: "Konfig", value: "/app/.env" },
    { icon: FileText, label: "Logs", value: "/app/logs/server.log" },
  ];

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div
        className="ml-4 w-[350px] bg-zinc-900 light:bg-white light:border-2 light:border-slate-300 md:rounded-[16px] flex flex-col overflow-hidden mt-[72px]"
        style={{ maxHeight: "calc(100% - 88px)" }}
      >
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-zinc-800 light:border-slate-200">
          <FolderOpen size={15} className="text-zinc-400 light:text-slate-500" />
          <p className="flex-1 font-medium text-sm text-white light:text-slate-900">
            {t("sidebar.filesystem.title", "Verzeichnis")}
          </p>
          <button
            onClick={closeSidebar}
            type="button"
            className="text-white/60 light:text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 no-scroll">
          <p className="text-xs text-zinc-500 light:text-slate-400 mb-4">
            {t("sidebar.filesystem.desc", "OpenAfD läuft auf folgendem System:")}
          </p>
          <div className="flex flex-col gap-3">
            {rootInfo.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 light:bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-zinc-400 light:text-slate-500" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 light:text-slate-400 uppercase tracking-widest">
                    {label}
                  </p>
                  <p className="text-xs font-mono text-zinc-200 light:text-slate-800 mt-0.5">
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-3 rounded-lg bg-zinc-800 light:bg-slate-100 border border-zinc-700 light:border-slate-200">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 light:text-slate-400 mb-1">
              {t("sidebar.filesystem.hint_title", "Hinweis")}
            </p>
            <p className="text-xs text-zinc-400 light:text-slate-500 leading-relaxed">
              {t("sidebar.filesystem.hint", "Detaillierte Dateisystem-Infos sind über die Konsole (Terminal-Tab) zugänglich.")}
            </p>
          </div>
        </div>
      </div>
    </ChatSidebar>
  );
}
