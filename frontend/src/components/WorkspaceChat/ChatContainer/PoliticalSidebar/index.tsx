// SPDX-License-Identifier: MIT
import { useState, useMemo } from "react";
import { Newspaper } from "@phosphor-icons/react/dist/csr/Newspaper";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { ArrowClockwise } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { useTranslation } from "react-i18next";
import { usePoliticalData } from "@/hooks/usePoliticalData";
import ChatSidebar, { usePoliticalSidebar } from "../ChatSidebar";
import { PanelHeader } from "@/components/ui/PanelHeader";

function Section({ title, loading, error, onRetry, retryLabel, children }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] uppercase tracking-widest text-theme-text-muted">
        {title}
      </p>
      {loading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-xl bg-theme-bg-tertiary animate-pulse"
            />
          ))}
        </div>
      )}
      {error && (
        <div className="p-2 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex flex-col gap-2">
          <span>{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              type="button"
              className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-900/40 hover:bg-red-900/70 text-red-200 border-none cursor-pointer transition-colors"
            >
              <ArrowClockwise size={11} weight="bold" />
              {retryLabel}
            </button>
          )}
        </div>
      )}
      {!loading && !error && children}
    </div>
  );
}

export default function PoliticalSidebar() {
  const { sidebarOpen, closeSidebar } = usePoliticalSidebar();
  const { t } = useTranslation();
  const {
    drucksachen,
    rssItems,
    loadingDrucksachen,
    loadingRss,
    errorDrucksachen,
    errorRss,
    refreshDrucksachen,
    refreshRss,
    refreshAll,
  } = usePoliticalData();

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "drucksachen" | "news">("all");

  const filteredDrucksachen = useMemo(() => {
    if (!query.trim()) return drucksachen;
    const q = query.toLowerCase();
    return drucksachen.filter((d: any) =>
      (d.titel || d.title || "").toLowerCase().includes(q),
    );
  }, [drucksachen, query]);

  const filteredRssItems = useMemo(() => {
    if (!query.trim()) return rssItems;
    const q = query.toLowerCase();
    return rssItems.filter((item: any) =>
      (item.title || "").toLowerCase().includes(q),
    );
  }, [rssItems, query]);

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div className="w-full h-full bg-theme-bg-sidebar flex flex-col overflow-hidden">
        <PanelHeader
          icon={<Newspaper size={15} weight="fill" />}
          title={t("sidebar.political.title", "Politisches & Dokumente")}
          actions={
            <button
              onClick={refreshAll}
              type="button"
              disabled={loadingDrucksachen || loadingRss}
              className="text-theme-text-muted hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer disabled:opacity-40 p-1"
              aria-label={t("common.refresh")}
            >
              <ArrowClockwise
                size={13}
                weight="bold"
                className={
                  loadingDrucksachen || loadingRss ? "animate-spin" : ""
                }
              />
            </button>
          }
          onClose={closeSidebar}
        />

        {/* Filters and search bar */}
        <div className="px-4 py-3 flex flex-col gap-2 border-b border-theme-border shrink-0">
          <div className="flex gap-1 mb-1">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`flex-1 flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium border-none cursor-pointer transition-colors ${
                activeTab === "all"
                  ? "bg-theme-bg-tertiary text-theme-text-primary"
                  : "bg-transparent text-theme-text-muted hover:text-theme-text-primary"
              }`}
            >
              {t("common.all", "Alle")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("drucksachen")}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-medium border-none cursor-pointer transition-colors ${
                activeTab === "drucksachen"
                  ? "bg-theme-bg-tertiary text-theme-text-primary"
                  : "bg-transparent text-theme-text-muted hover:text-theme-text-primary"
              }`}
            >
              <FileText size={12} />
              {t("sidebar.political.drucksachen", "Drucksachen")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("news")}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-medium border-none cursor-pointer transition-colors ${
                activeTab === "news"
                  ? "bg-theme-bg-tertiary text-theme-text-primary"
                  : "bg-transparent text-theme-text-muted hover:text-theme-text-primary"
              }`}
            >
              <Newspaper size={12} />
              {t("sidebar.political.news", "Meldungen")}
            </button>
          </div>
          <div className="relative">
            <MagnifyingGlass
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("sidebar.political.searchPlaceholder", "In Drucksachen & Meldungen suchen...")}
              aria-label={t("sidebar.political.searchPlaceholder", "Suchen...")}
              className="w-full border border-theme-border rounded-md pl-8 pr-2 py-1.5 text-xs text-theme-text-primary bg-theme-bg-secondary focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 no-scroll flex flex-col gap-4">
          {/* Drucksachen */}
          {(activeTab === "all" || activeTab === "drucksachen") && (
            <Section
              title={t("sidebar.political.drucksachen", "Bundestag-Drucksachen")}
              loading={loadingDrucksachen}
              error={errorDrucksachen}
              onRetry={refreshDrucksachen}
              retryLabel={t("sidebar.retry")}
            >
              {filteredDrucksachen.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">
                  {t("sidebar.political.empty")}
                </p>
              ) : (
                filteredDrucksachen.map((d: any) => (
                  <a
                    key={d.id || d.dokumentnummer}
                    href={
                      d.id
                        ? `https://dip.bundestag.de/dokumente/ablage/${d.id}`
                        : "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-theme-bg-secondary border border-theme-border hover:border-zinc-500 transition-colors"
                  >
                    <FileText
                      size={14}
                      weight="regular"
                      className="text-zinc-400 flex-shrink-0 mt-0.5"
                    />
                    <p className="text-xs text-zinc-200 light:text-slate-800 leading-snug line-clamp-2 flex-1">
                      {d.titel || d.title || `—`}
                    </p>
                    <ArrowSquareOut
                      size={11}
                      className="text-zinc-600 flex-shrink-0 mt-0.5"
                    />
                  </a>
                ))
              )}
            </Section>
          )}

          {/* RSS */}
          {(activeTab === "all" || activeTab === "news") && (
            <Section
              title={t("sidebar.political.news", "Politische Meldungen (RSS)")}
              loading={loadingRss}
              error={errorRss}
              onRetry={refreshRss}
              retryLabel={t("sidebar.retry")}
            >
              {filteredRssItems.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">
                  {t("sidebar.political.rss_empty")}
                </p>
              ) : (
                filteredRssItems.map((item: any, i: number) => (
                  <a
                    key={item.guid || item.link || i}
                    href={item.link || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-theme-bg-secondary border border-theme-border hover:border-zinc-500 transition-colors"
                  >
                    <Newspaper
                      size={14}
                      weight="regular"
                      className="text-zinc-400 flex-shrink-0 mt-0.5"
                    />
                    <p className="text-xs text-zinc-200 light:text-slate-800 leading-snug line-clamp-2 flex-1">
                      {item.title}
                    </p>
                    <ArrowSquareOut
                      size={11}
                      className="text-zinc-600 flex-shrink-0 mt-0.5"
                    />
                  </a>
                ))
              )}
            </Section>
          )}

          <div className="p-3 rounded-xl bg-theme-bg-tertiary border border-theme-border">
            <p className="text-[10px] text-theme-text-muted leading-relaxed">
              {t("sidebar.political.hint")}
            </p>
          </div>
        </div>
      </div>
    </ChatSidebar>
  );
}
