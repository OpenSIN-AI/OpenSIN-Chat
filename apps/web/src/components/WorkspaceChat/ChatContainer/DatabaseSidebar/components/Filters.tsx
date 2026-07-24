// SPDX-License-Identifier: MIT
// Filter bar with tab toggle (Politicians/Speeches/Drucksachen) and search inputs
import { Users } from "@phosphor-icons/react/dist/csr/Users";
import { Microphone } from "@phosphor-icons/react/dist/csr/Microphone";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { useTranslation } from "react-i18next";

interface FiltersProps {
  activeTab: "politicians" | "speeches" | "drucksachen";
  onTabChange: (tab: "politicians" | "speeches" | "drucksachen") => void;
  query: string;
  onQueryChange: (v: string) => void;
  party: string;
  onPartyChange: (v: string) => void;
  state: string;
  onStateChange: (v: string) => void;
  parties: string[];
  states: string[];
  speechQuery: string;
  onSpeechQueryChange: (v: string) => void;
  onSearchSpeeches: () => void;
  speechLoading: boolean;
  dipQuery: string;
  onDipQueryChange: (v: string) => void;
  onSearchDrucksachen: () => void;
  dipLoading: boolean;
}

export function Filters({
  activeTab,
  onTabChange,
  query,
  onQueryChange,
  party,
  onPartyChange,
  state,
  onStateChange,
  parties,
  states,
  speechQuery,
  onSpeechQueryChange,
  onSearchSpeeches,
  speechLoading,
  dipQuery,
  onDipQueryChange,
  onSearchDrucksachen,
  dipLoading,
}: FiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="px-4 py-3 flex flex-col gap-2 border-b border-zinc-800 light:border-slate-200">
      {/* Tab toggle: Politicians | Speeches | Drucksachen */}
      <div className="flex gap-1 mb-1">
        <button
          type="button"
          onClick={() => onTabChange("politicians")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border-none cursor-pointer transition-colors ${
            activeTab === "politicians"
              ? "bg-zinc-700 light:bg-slate-200 text-theme-text-primary light:text-theme-text-primary"
              : "bg-transparent text-zinc-500 light:text-slate-400 hover:text-zinc-300"
          }`}
        >
          <Users size={12} />
          {t("sidebar.database.tabPoliticians", "Politiker")}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("speeches")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border-none cursor-pointer transition-colors ${
            activeTab === "speeches"
              ? "bg-zinc-700 light:bg-slate-200 text-theme-text-primary light:text-theme-text-primary"
              : "bg-transparent text-zinc-500 light:text-slate-400 hover:text-zinc-300"
          }`}
        >
          <Microphone size={12} />
          {t("sidebar.database.tabSpeeches", "Reden")}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("drucksachen")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border-none cursor-pointer transition-colors ${
            activeTab === "drucksachen"
              ? "bg-zinc-700 light:bg-slate-200 text-theme-text-primary light:text-theme-text-primary"
              : "bg-transparent text-zinc-500 light:text-slate-400 hover:text-zinc-300"
          }`}
        >
          <FileText size={12} />
          {t("sidebar.database.tabDrucksachen", "Drucksachen")}
        </button>
      </div>

      {activeTab === "speeches" ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 light:text-slate-400"
            />
            <input
              type="search"
              value={speechQuery}
              onChange={(e) => onSpeechQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearchSpeeches()}
              placeholder={t(
                "sidebar.database.speechSearch",
                "Thema suchen (z.B. Klima)...",
              )}
              aria-label={t("sidebar.database.speechSearch", "Thema suchen...")}
              className="w-full border border-zinc-700 light:border-slate-300 rounded-md pl-8 pr-2 py-1.5 text-sm text-theme-text-primary light:text-theme-text-primary bg-zinc-900 light:bg-white focus:outline-none focus:border-zinc-500"
            />
          </div>
          <button
            type="button"
            onClick={onSearchSpeeches}
            disabled={speechLoading || !speechQuery.trim()}
            className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium"
          >
            {speechLoading ? "..." : t("common.search", "Suchen")}
          </button>
        </div>
      ) : activeTab === "drucksachen" ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 light:text-slate-400"
            />
            <input
              type="search"
              value={dipQuery}
              onChange={(e) => onDipQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearchDrucksachen()}
              placeholder={t(
                "sidebar.database.dipSearch",
                "Bundestags-Drucksachen durchsuchen...",
              )}
              aria-label={t(
                "sidebar.database.dipSearch",
                "Bundestags-Drucksachen durchsuchen...",
              )}
              className="w-full border border-zinc-700 light:border-slate-300 rounded-md pl-8 pr-2 py-1.5 text-sm text-theme-text-primary light:text-theme-text-primary bg-zinc-900 light:bg-white focus:outline-none focus:border-zinc-500"
            />
          </div>
          <button
            type="button"
            onClick={onSearchDrucksachen}
            disabled={dipLoading || !dipQuery.trim()}
            className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium"
          >
            {dipLoading ? "..." : t("common.search", "Suchen")}
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <MagnifyingGlass
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 light:text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t("sidebar.database.search", "Name suchen...")}
              aria-label={t("sidebar.database.search", "Name suchen...")}
              className="w-full border border-zinc-700 light:border-slate-300 rounded-md pl-8 pr-2 py-1.5 text-sm text-theme-text-primary light:text-theme-text-primary bg-zinc-900 light:bg-white focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={party}
              onChange={(e) => onPartyChange(e.target.value)}
              className="flex-1 border border-zinc-700 light:border-slate-300 rounded-md px-2 py-1.5 text-sm text-theme-text-primary light:text-theme-text-primary bg-zinc-900 light:bg-white focus:outline-none focus:border-zinc-500"
              aria-label={t("sidebar.database.partyFilter", "Partei")}
            >
              <option value="">
                {t("sidebar.database.allParties", "Alle Parteien")}
              </option>
              {parties.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={state}
              onChange={(e) => onStateChange(e.target.value)}
              className="flex-1 border border-zinc-700 light:border-slate-300 rounded-md px-2 py-1.5 text-sm text-theme-text-primary light:text-theme-text-primary bg-zinc-900 light:bg-white focus:outline-none focus:border-zinc-500"
              aria-label={t("sidebar.database.stateFilter", "Bundesland")}
            >
              <option value="">
                {t("sidebar.database.allStates", "Alle Bundesländer")}
              </option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}
