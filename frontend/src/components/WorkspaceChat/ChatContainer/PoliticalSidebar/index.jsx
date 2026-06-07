// SPDX-License-Identifier: MIT
import { X, Newspaper, Scroll, FileText, Binoculars } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import ChatSidebar from "../ChatSidebar";
import { usePoliticalSidebar } from "../ChatSidebar";

const CATEGORIES = [
  {
    id: "press",
    icon: Newspaper,
    label: "Pressemitteilungen",
    description: "AfD-Pressemitteilungen und offizielle Statements",
  },
  {
    id: "drucksachen",
    icon: Scroll,
    label: "Bundestags-Drucksachen",
    description: "Kleine/Große Anfragen, Anträge der AfD-Fraktion",
  },
  {
    id: "laws",
    icon: FileText,
    label: "Gesetzesentwürfe",
    description: "Eingebrachte Gesetzesentwürfe der AfD",
  },
  {
    id: "research",
    icon: Binoculars,
    label: "Deep Research Berichte",
    description: "KI-gestützte politische Analysen und Hintergrundberichte",
  },
];

export default function PoliticalSidebar() {
  const { sidebarOpen, closeSidebar } = usePoliticalSidebar();
  const { t } = useTranslation();

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div
        className="ml-4 w-[350px] bg-zinc-900 light:bg-white light:border-2 light:border-slate-300 md:rounded-[16px] flex flex-col overflow-hidden mt-[72px]"
        style={{ maxHeight: "calc(100% - 88px)" }}
      >
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-zinc-800 light:border-slate-200">
          <Newspaper size={15} className="text-zinc-400 light:text-slate-500" />
          <p className="flex-1 font-medium text-sm text-white light:text-slate-900">
            {t("sidebar.political.title", "Politisches")}
          </p>
          <button
            onClick={closeSidebar}
            type="button"
            className="text-white/60 light:text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 no-scroll flex flex-col gap-3">
          <p className="text-xs text-zinc-500 light:text-slate-400">
            {t("sidebar.political.desc", "Politische Inhalte und Quellen:")}
          </p>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200 hover:border-zinc-500 light:hover:border-slate-300 transition-colors text-left cursor-pointer w-full"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-700 light:bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <cat.icon size={15} className="text-zinc-300 light:text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-white light:text-slate-900">
                  {cat.label}
                </p>
                <p className="text-xs text-zinc-400 light:text-slate-500 leading-relaxed mt-0.5">
                  {cat.description}
                </p>
              </div>
            </button>
          ))}
          <div className="mt-2 p-3 rounded-xl bg-zinc-800/50 light:bg-slate-50 border border-zinc-700 light:border-slate-200">
            <p className="text-[10px] text-zinc-500 light:text-slate-400 leading-relaxed">
              {t("sidebar.political.agent_hint", 'Tipp: Nutze "@agent Bundestag Drucksache..." im Chat für automatisierte Abfragen.')}
            </p>
          </div>
        </div>
      </div>
    </ChatSidebar>
  );
}
