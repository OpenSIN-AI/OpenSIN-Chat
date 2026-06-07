// SPDX-License-Identifier: MIT
import { X, Database, Users, Buildings, MagnifyingGlass } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import ChatSidebar from "../ChatSidebar";
import { useDatabaseSidebar } from "../ChatSidebar";

const DATA_SOURCES = [
  {
    id: "bundestag",
    icon: Buildings,
    label: "Bundestag API",
    description: "Aktuelle Bundestags-Daten: Abgeordnete, Ausschüsse, Abstimmungen",
    status: "active",
    url: "https://search.dip.bundestag.de/api/v1",
  },
  {
    id: "abgeordnetenwatch",
    icon: Users,
    label: "Abgeordnetenwatch",
    description: "Profile, Wahlversprechen, Nebentätigkeiten aller Politiker",
    status: "active",
    url: "https://www.abgeordnetenwatch.de/api/v2",
  },
];

export default function DatabaseSidebar() {
  const { sidebarOpen, closeSidebar } = useDatabaseSidebar();
  const { t } = useTranslation();

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div
        className="ml-4 w-[350px] bg-zinc-900 light:bg-white light:border-2 light:border-slate-300 md:rounded-[16px] flex flex-col overflow-hidden mt-[72px]"
        style={{ maxHeight: "calc(100% - 88px)" }}
      >
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-zinc-800 light:border-slate-200">
          <Database size={15} className="text-zinc-400 light:text-slate-500" />
          <p className="flex-1 font-medium text-sm text-white light:text-slate-900">
            {t("sidebar.database.title", "Politiker-Datenbank")}
          </p>
          <button
            onClick={closeSidebar}
            type="button"
            className="text-white/60 light:text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 no-scroll flex flex-col gap-4">
          <p className="text-xs text-zinc-500 light:text-slate-400">
            {t("sidebar.database.desc", "Verbundene Datenquellen für Politikerdaten:")}
          </p>
          {DATA_SOURCES.map((source) => (
            <div
              key={source.id}
              className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200"
            >
              <div className="flex items-center gap-2">
                <source.icon size={15} className="text-zinc-300 light:text-slate-700" />
                <span className="text-sm font-medium text-white light:text-slate-900 flex-1">
                  {source.label}
                </span>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    source.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-zinc-700 text-zinc-400"
                  }`}
                >
                  {source.status === "active"
                    ? t("sidebar.database.active", "Aktiv")
                    : t("sidebar.database.inactive", "Inaktiv")}
                </span>
              </div>
              <p className="text-xs text-zinc-400 light:text-slate-500 leading-relaxed">
                {source.description}
              </p>
              <p className="text-[10px] font-mono text-zinc-600 light:text-slate-400 truncate">
                {source.url}
              </p>
            </div>
          ))}
          <div className="mt-2">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 light:text-slate-400 mb-2">
              {t("sidebar.database.search_hint", "Suche über Agent")}
            </p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 light:bg-slate-100 border border-zinc-700 light:border-slate-200">
              <MagnifyingGlass size={13} className="text-zinc-500" />
              <p className="text-xs text-zinc-500 light:text-slate-400">
                {t("sidebar.database.agent_hint", 'Nutze "@agent Suche Politiker..." im Chat')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </ChatSidebar>
  );
}
